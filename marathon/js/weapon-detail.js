// Weapon Detail Page JavaScript

let weapon = null;
let seasons = [];
let weaponHistory = [];
let weaponSkins = [];
let currentSeasonId = null;
let skinsLoaded = false;
let equippedMods = {};     // { slotType: modObject }
let weaponModSlots = null; // cached mods-for-weapon response

// ================================================================================================
// MOD DETAIL MODAL (reuses the mods page modal design)
// ================================================================================================

const MOD_SLOT_ICONS = {
    optic:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>',
    barrel:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M2 12h20"/><path d="M6 8v8"/><path d="M18 8v8"/><circle cx="12" cy="12" r="2"/></svg>',
    magazine:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M3 15h18"/></svg>',
    grip:      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0"/><path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v2"/><path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8"/><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"/></svg>',
    chip:      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M15 2v2M9 2v2M15 20v2M9 20v2M2 15h2M2 9h2M20 15h2M20 9h2"/></svg>',
    generator: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>',
    shield:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
};

const MOD_CHANGE_TYPE_META = {
    added:     { icon: '\u271a', cls: 'new',    label: 'Added' },
    buffed:    { icon: '\u25b2', cls: 'buff',   label: 'Buffed' },
    nerfed:    { icon: '\u25bc', cls: 'nerf',   label: 'Nerfed' },
    reworked:  { icon: '\u27f3', cls: 'rework', label: 'Reworked' },
    removed:   { icon: '\u2715', cls: 'nerf',   label: 'Removed' },
    unchanged: { icon: '\u2014', cls: 'new',    label: 'Unchanged' },
};

let currentModSlug = null;

// ===== FOCUS TRAP UTILITY =====
function setupFocusTrap(container) {
    container._focusTrapHandler = function(e) {
        if (e.key !== 'Tab') return;
        const focusable = container.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])');
        if (focusable.length === 0) return;
        const first = focusable[0], last = focusable[focusable.length - 1];
        if (e.shiftKey) {
            if (document.activeElement === first) { e.preventDefault(); last.focus(); }
        } else {
            if (document.activeElement === last) { e.preventDefault(); first.focus(); }
        }
    };
    container.addEventListener('keydown', container._focusTrapHandler);
}
function removeFocusTrap(container) {
    if (container._focusTrapHandler) {
        container.removeEventListener('keydown', container._focusTrapHandler);
        delete container._focusTrapHandler;
    }
}

function openWeaponModModal(slug) {
    if (!slug) return;
    currentModSlug = slug;

    const overlay = document.getElementById('modModal');
    if (!overlay) return;

    overlay.classList.add('active');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');

    // Focus the close button and trap focus
    requestAnimationFrame(() => {
        const closeBtn = overlay.querySelector('.mod-modal-close');
        if (closeBtn) closeBtn.focus();
    });
    setupFocusTrap(overlay);

    // Push modal ads on first open (deferred so they don't load on hidden page)
    if (!overlay._adsPushed) {
        overlay._adsPushed = true;
        overlay.querySelectorAll('ins.adsbygoogle').forEach(() => {
            try { (adsbygoogle = window.adsbygoogle || []).push({}); } catch (e) {}
        });
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
    const statImpactSection = document.getElementById('modModalStatImpactSection');
    if (statImpactSection) statImpactSection.style.display = 'none';
    const iconEl = document.getElementById('modModalIcon');
    if (iconEl) iconEl.src = '';
    hideModModalSections();

    // Fetch and render
    MarathonAPI.getModBySlug(slug).then(response => {
        if (response?.data) {
            populateModModal(response.data);
        } else {
            document.getElementById('modModalName').textContent = 'Mod not found';
        }
    }).catch(err => {
        console.error('Failed to load mod detail:', err);
        document.getElementById('modModalName').textContent = 'Error loading mod';
    });
}

function closeWeaponModModal() {
    const overlay = document.getElementById('modModal');
    if (!overlay || !overlay.classList.contains('active')) return;

    overlay.classList.remove('active');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
    removeFocusTrap(overlay);
    currentModSlug = null;
}

function hideModModalSections() {
    ['modModalEffectsSection', 'modModalWeaponsSection', 'modModalHistorySection'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });
}

function modModalCapitalizeFirst(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function modModalFormatLabel(str) {
    if (!str) return '';
    return str.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function modModalFormatSlug(slug) {
    if (!slug) return '';
    return slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function modModalGetSlotIcon(slot) {
    return MOD_SLOT_ICONS[slot] || MOD_SLOT_ICONS.chip;
}

function populateModModal(mod) {
    const rarity   = (mod.rarity || 'enhanced').toLowerCase();
    const slotType = (mod.slot_type || 'chip').toLowerCase();
    const MODS_IMG_BASE = 'https://mods.marathondb.gg/images/';
    const PLACEHOLDER_URL = MODS_IMG_BASE + '_placeholder.webp';
    const rawWebp = mod.icon_url_webp || '';
    const iconUrl = (rawWebp && rawWebp !== PLACEHOLDER_URL)
        ? rawWebp
        : (mod.slug ? `${MODS_IMG_BASE}${encodeURIComponent(mod.slug)}.webp` : (mod.icon_url || ''));

    // Icon
    const iconImg = document.getElementById('modModalIcon');
    if (iconImg && iconUrl) {
        iconImg.src = iconUrl;
        iconImg.alt = mod.name || '';
    }

    const iconFrame = document.getElementById('modModalIconFrame');
    if (iconFrame) iconFrame.className = 'mod-modal-icon-frame ' + rarity;

    const glow = document.getElementById('modModalRarityGlow');
    if (glow) glow.className = 'mod-modal-rarity-glow ' + rarity;

    // Name
    document.getElementById('modModalName').textContent = mod.name || 'Unknown Mod';

    // Description
    const descEl = document.getElementById('modModalDescription');
    descEl.textContent = '';
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
            ${modModalGetSlotIcon(slotType)}
            ${modModalCapitalizeFirst(slotType)}
        </span>
        <span class="cd-badge cd-badge-rarity ${rarity}">
            ${modModalCapitalizeFirst(rarity)}
        </span>
        ${dmgBadge}
        ${verifiedBadge}
        ${costBadge}
        ${compatBadge}
    `;

    // Quick stats
    modModalRenderQuickStats(mod);
    modModalRenderStatImpact(mod);
    modModalRenderWeapons(mod);
    modModalRenderHistory(mod);
    modModalRenderMeta(mod);
}

function modModalRenderQuickStats(mod) {
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

function modModalRenderEffects(mod) {
    const effects = mod.effects || [];
    const section = document.getElementById('modModalEffectsSection');
    const container = document.getElementById('modModalEffects');
    if (!effects.length) { if (section) section.style.display = 'none'; return; }
    if (section) section.style.display = '';
    if (!container) return;
    container.innerHTML = effects.map(eff => `
        <div class="mod-modal-effect-row">
            <span class="mod-modal-effect-icon">\u26a1</span>
            <div class="mod-modal-effect-info">
                <span class="mod-modal-effect-text">${escapeHtml(eff.display_text || '')}</span>
                ${eff.stat_key ? '<span class="mod-modal-effect-stat">' + modModalFormatLabel(eff.stat_key) + (eff.delta != null ? ': ' + (eff.delta > 0 ? '+' : '') + eff.delta + (eff.unit === 'percent' ? '%' : eff.unit === 'degrees' ? '\u00b0' : eff.unit === 'seconds' ? 's' : '') : '') + '</span>' : ''}
            </div>
        </div>
    `).join('');
}

// ── Stat Impact Comparison ──
// Shows before/after stat bars when viewing a mod on a weapon detail page

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

// Map mod effect stat_key variants to weapon.stats keys
const EFFECT_TO_STAT_KEY = {
    firepower: 'firepower_score',
    firepower_score: 'firepower_score',
    accuracy: 'accuracy_score',
    accuracy_score: 'accuracy_score',
    handling: 'handling_score',
    handling_score: 'handling_score',
    range: 'range_meters',
    range_meters: 'range_meters',
    magazine_size: 'magazine_size',
    magazine: 'magazine_size',
    zoom: 'zoom',
    fire_rate: 'rate_of_fire',
    rate_of_fire: 'rate_of_fire',
    rpm: 'rate_of_fire',
    reload_speed: 'reload_speed',
    reload_time: 'reload_speed',
    aim_assist: 'aim_assist',
    recoil: 'recoil',
    precision: 'precision',
    charge_time: 'charge_time_seconds',
    charge_time_seconds: 'charge_time_seconds',
    volt_drain: 'volt_drain',
    voltdrain: 'volt_drain',
    damage: 'damage',
    weight: 'weight',
    hipfire_spread: 'hipfire_spread',
    ads_spread: 'ads_spread',
    ads_zoom: 'zoom',
    ads_accuracy: 'ads_spread',
    ready_speed: 'equip_speed',
    crouch_spread_bonus: 'crouch_spread_bonus',
    moving_inaccuracy: 'moving_inaccuracy',
    equip_speed: 'equip_speed',
    ads_speed: 'ads_speed',
};

function modModalRenderStatImpact(mod) {
    // Only render on weapon detail pages where 'weapon' global exists
    if (!weapon || !weapon.stats) return;

    const stats = weapon.stats;

    // Determine which effects to use: per-weapon overrides for this weapon first, then base
    let effects = mod.effects || [];
    const compatWeapons = mod.compatible_weapons || [];
    for (const cw of compatWeapons) {
        const cwSlug = (typeof cw === 'object' && cw !== null) ? cw.weapon_slug : null;
        if (cwSlug === weapon.slug && cw.effects && cw.effects.length > 0) {
            effects = cw.effects;
            break;
        }
    }

    // Filter to effects that have stat_key + delta and map to a known weapon stat
    const mappedEffects = [];
    for (const eff of effects) {
        if (eff.stat_key == null || eff.delta == null) continue;
        const weaponStatKey = EFFECT_TO_STAT_KEY[eff.stat_key] || eff.stat_key;
        const config = STAT_IMPACT_CONFIGS.find(c => c.key === weaponStatKey);
        if (!config) continue;
        const baseValue = parseFloat(stats[weaponStatKey]);
        if (isNaN(baseValue)) continue;

        let modifiedValue;
        if (eff.unit === 'percent') {
            modifiedValue = baseValue + (baseValue * eff.delta / 100);
        } else {
            modifiedValue = baseValue + eff.delta;
        }

        mappedEffects.push({ config, baseValue, modifiedValue, delta: eff.delta, unit: eff.unit });
    }

    // Get or create the section element
    let section = document.getElementById('modModalStatImpactSection');
    if (!section) {
        section = document.createElement('div');
        section.className = 'mod-modal-section';
        section.id = 'modModalStatImpactSection';
        // Insert after the effects section
        const effectsSection = document.getElementById('modModalEffectsSection');
        if (effectsSection && effectsSection.parentNode) {
            effectsSection.parentNode.insertBefore(section, effectsSection.nextSibling);
        } else {
            // Fallback: append to mod-modal-right
            const modalRight = document.querySelector('#modModal .mod-modal-right');
            if (modalRight) {
                const metaEl = document.getElementById('modModalMeta');
                if (metaEl) modalRight.insertBefore(section, metaEl);
                else modalRight.appendChild(section);
            }
        }
    }

    if (mappedEffects.length === 0) {
        section.style.display = 'none';
        return;
    }

    section.style.display = '';

    const weaponName = weapon.name || 'This Weapon';
    let html = `
        <div class="mod-modal-section-header">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
                <path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/>
            </svg>
            <h3>Stat Impact on ${escapeHtml(weaponName)}</h3>
        </div>
        <div class="stat-impact-rows">
    `;

    for (const { config, baseValue, modifiedValue, delta, unit } of mappedEffects) {
        const maxVal = config.maxValue;
        const inv = config.inverse;

        // Bar percentages
        const basePercent = inv
            ? Math.max(0, Math.min(100, ((maxVal - baseValue) / maxVal) * 100))
            : Math.max(0, Math.min(100, (baseValue / maxVal) * 100));
        const modPercent = inv
            ? Math.max(0, Math.min(100, ((maxVal - modifiedValue) / maxVal) * 100))
            : Math.max(0, Math.min(100, (modifiedValue / maxVal) * 100));

        // Determine if this change is beneficial
        // For inverse stats (reload_speed, charge_time), lower = better, so negative delta = buff
        const isBuff = inv ? delta < 0 : delta > 0;
        const changeClass = isBuff ? 'stat-impact-buff' : 'stat-impact-nerf';
        const arrow = isBuff ? '▲' : '▼';

        // Display values
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
    section.innerHTML = html;
}

function modModalRenderWeapons(mod) {
    const weapons = mod.compatible_weapons || [];
    const section = document.getElementById('modModalWeaponsSection');
    const container = document.getElementById('modModalWeapons');
    if (!weapons.length) { if (section) section.style.display = 'none'; return; }
    if (section) section.style.display = '';
    if (!container) return;
    container.innerHTML = weapons.map(w => {
        const slug = (typeof w === 'object' && w !== null) ? w.weapon_slug : w;
        return `<a href="/marathon/weapons/${escapeHtml(slug)}/" class="mod-modal-weapon-link" title="${modModalFormatSlug(slug)}">
            ${modModalFormatSlug(slug)}
        </a>`;
    }).join('');
}

function modModalRenderHistory(mod) {
    const history = mod.history || [];
    const section = document.getElementById('modModalHistorySection');
    const container = document.getElementById('modModalHistory');
    if (!history.length) { if (section) section.style.display = 'none'; return; }
    if (section) section.style.display = '';
    if (!container) return;
    container.innerHTML = history.map((h, i) => {
        const meta = MOD_CHANGE_TYPE_META[h.change_type] || MOD_CHANGE_TYPE_META.unchanged;
        const isLast = i === history.length - 1;
        let changesHtml = '';
        if (h.previous_values || h.new_values) {
            try {
                const prev = typeof h.previous_values === 'string' ? JSON.parse(h.previous_values) : h.previous_values;
                const next = typeof h.new_values === 'string' ? JSON.parse(h.new_values) : h.new_values;
                const allKeys = new Set([...Object.keys(prev || {}), ...Object.keys(next || {})]);
                changesHtml = Array.from(allKeys).map(key => {
                    const oldVal = prev?.[key] ?? '\u2014';
                    const newVal = next?.[key] ?? '\u2014';
                    const direction = (typeof newVal === 'number' && typeof oldVal === 'number')
                        ? (newVal > oldVal ? 'buff' : newVal < oldVal ? 'nerf' : '') : '';
                    return '<div class="mod-modal-hist-change">' +
                        '<span class="mod-modal-hist-key">' + modModalFormatLabel(key) + '</span>' +
                        '<span class="mod-modal-hist-old">' + oldVal + '</span>' +
                        '<span class="mod-modal-hist-arrow">\u2192</span>' +
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

function modModalRenderMeta(mod) {
    const rows = [];
    if (mod.season_name) rows.push(['Season', escapeHtml(mod.season_name)]);
    if (mod.patch_number) rows.push(['Introduced', 'v' + escapeHtml(String(mod.patch_number))]);
    if (mod.is_active !== undefined) rows.push(['Status', mod.is_active ? 'Active' : 'Inactive']);
    const weapons = mod.compatible_weapons || [];
    if (weapons.length) rows.push(['Compatible Weapons', weapons.length]);

    const container = document.getElementById('modModalMeta');
    if (!container) return;
    if (!rows.length) { container.innerHTML = ''; return; }

    container.innerHTML = `
        <div class="mod-modal-meta-grid">
            ${rows.map(([label, val]) => `<div class="mod-modal-meta-row"><span class="mod-modal-meta-label">${label}</span><span class="mod-modal-meta-value">${val}</span></div>`).join('')}
        </div>
        <a href="/mods/?mod=${encodeURIComponent(currentModSlug)}" class="mod-modal-full-link">View on Mods Hub \u2192</a>
    `;
}

function setupModModalEvents() {
    document.getElementById('modModalBackdrop')?.addEventListener('click', closeWeaponModModal);
    document.getElementById('modModalClose')?.addEventListener('click', closeWeaponModModal);
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && currentModSlug) closeWeaponModModal();
    });

    // Intercept SSG-rendered mod tag links to open modal instead of navigating
    // Exclude links inside the modal itself (e.g. "View on Mods Hub")
    document.addEventListener('click', (e) => {
        const link = e.target.closest('a[href^="/mods/?mod="]');
        if (link && document.getElementById('modModal') && !link.closest('#modModal')) {
            e.preventDefault();
            const url = new URL(link.href, window.location.origin);
            const slug = url.searchParams.get('mod');
            if (slug) openWeaponModModal(slug);
        }
    });
}

// Initialize
document.addEventListener('DOMContentLoaded', async function() {
    const slug = getWeaponSlug();
    
    if (!slug) {
        showError();
        return;
    }
    
    // Load seasons for reference
    try {
        const seasonsResponse = await MarathonAPI.getSeasons();
        if (seasonsResponse?.data) {
            seasons = seasonsResponse.data;
        }
    } catch (e) {
        console.warn('Could not load seasons:', e);
    }
    
    // Load weapon data
    await loadWeapon(slug);
    
    // Setup event listeners
    setupEventListeners();
    
    // Setup tab navigation
    setupTabNavigation();
    
    // Setup mod detail modal events
    setupModModalEvents();
});

// Get weapon slug from URL (supports /marathon/weapons/[slug]/ and legacy /weapons/[slug]/)
function getWeaponSlug() {
    const pathParts = window.location.pathname.split('/').filter(Boolean);
    const wi = pathParts.indexOf('weapons');
    if (wi !== -1 && pathParts[wi + 1]) {
        return pathParts[wi + 1];
    }
    // Fallback to query params for backwards compatibility
    const params = new URLSearchParams(window.location.search);
    return params.get('slug') || params.get('id');
}

// Setup share button handlers
function setupShareButtons() {
    const twitterBtn = document.getElementById('shareTwitter');
    const copyBtn = document.getElementById('shareCopy');
    const discordBtn = document.getElementById('shareDiscord');
    
    const shareUrl = window.location.href;
    const shareTitle = `${weapon.name} - Marathon Weapon`;
    const shareText = `Check out ${weapon.name} (${weapon.category_name || weapon.category || 'Weapon'}) on MarathonDB!`;
    
    // Twitter/X share
    if (twitterBtn) {
        twitterBtn.addEventListener('click', () => {
            const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
            window.open(twitterUrl, '_blank', 'width=550,height=420');
        });
    }

    // Discord share (copies formatted markdown link)
    if (discordBtn) {
        discordBtn.addEventListener('click', async () => {
            try {
                const discordText = `**${weapon.name}** — ${weapon.category_name || weapon.category || 'Weapon'} | MarathonDB\n${shareUrl}`;
                await navigator.clipboard.writeText(discordText);
                showCopyToast('Discord markdown copied to clipboard!');
                discordBtn.classList.add('copied');
                setTimeout(() => { discordBtn.classList.remove('copied'); }, 2000);
            } catch (err) {
                console.error('Failed to copy:', err);
            }
        });
    }
    
    // Copy link
    if (copyBtn) {
        copyBtn.addEventListener('click', async () => {
            try {
                await navigator.clipboard.writeText(shareUrl);
                showCopyToast('Link copied to clipboard!');
                copyBtn.classList.add('copied');
                setTimeout(() => { copyBtn.classList.remove('copied'); }, 2000);
            } catch (err) {
                console.error('Failed to copy:', err);
            }
        });
    }
}

// Show toast notification for copy actions
function showCopyToast(message) {
    let toast = document.getElementById('copyToast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'copyToast';
        toast.className = 'copy-toast';
        toast.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg><span></span>';
        document.body.appendChild(toast);
    }
    toast.querySelector('span').textContent = message;
    toast.classList.add('show');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => { toast.classList.remove('show'); }, 2500);
}

// Open image in a lightbox overlay
function openImageLightbox(imageUrl, altText) {
    // Remove existing lightbox if any
    const existingLightbox = document.getElementById('imageLightbox');
    if (existingLightbox) existingLightbox.remove();
    
    // Create lightbox
    const lightbox = document.createElement('div');
    lightbox.id = 'imageLightbox';
    lightbox.className = 'image-lightbox';
    lightbox.innerHTML = `
        <div class="lightbox-backdrop"></div>
        <div class="lightbox-content">
            <button class="lightbox-close" title="Close (ESC)">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
            </button>
            <img src="${imageUrl}" alt="${escapeHtml(altText)} - Full Size" />
        </div>
    `;
    
    document.body.appendChild(lightbox);
    document.body.style.overflow = 'hidden';

    // Focus the close button for accessibility
    const closeBtn = lightbox.querySelector('.lightbox-close');
    closeBtn.focus();
    
    // Close handlers
    const closeLightbox = () => {
        lightbox.remove();
        document.body.style.overflow = '';
        document.removeEventListener('keydown', escHandler);
    };
    
    lightbox.querySelector('.lightbox-backdrop').addEventListener('click', closeLightbox);
    closeBtn.addEventListener('click', closeLightbox);
    
    const escHandler = (e) => {
        if (e.key === 'Escape') closeLightbox();
    };
    document.addEventListener('keydown', escHandler);
}

// Load weapon data
async function loadWeapon(slug) {
    try {
        const res = await fetch(`https://weapons.marathondb.gg/api/weapons/${encodeURIComponent(slug)}`);
        const weaponResponse = await res.json();

        if (!weaponResponse?.data) {
            showError();
            return;
        }

        const rawData = weaponResponse.data;

        // Save full stats array as season history before normalizing
        if (Array.isArray(rawData.stats)) {
            weaponHistory = rawData.stats;
        }

        // Normalize: flatten to current-season stats object
        weapon = WeaponsAPI.normalizeWeapon(rawData);
        currentSeasonId = weapon.stats?.season_id;

        await renderWeapon();
        renderSeasonSelector();
        setupRatingInteraction();
        setupShareButtons();
    } catch (error) {
        console.error('Error loading weapon:', error);
        showError();
    }
}

// Render weapon details
async function renderWeapon() {
    // Hide loading, show content
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('weaponDetail').style.display = 'block';
    
    // Update page title and SEO meta tags
    updateMetaTags();
    
    // Add structured data for rich search results
    addStructuredData();
    
    // Update breadcrumb
    updateBreadcrumb();
    
    // Image - prefer WebP from weapons API, fallback to PNG and legacy fields
    const buildUrl = (path) => {
        if (!path) return null;
        if (path.startsWith('http')) return path;
        return `${MarathonAPI.getApiBase()}${path.startsWith('/') ? '' : '/'}${path}`;
    };
    const iconUrl = buildUrl(weapon.icon_url_webp) || buildUrl(weapon.icon_url_high) || buildUrl(weapon.icon_url)
        || buildUrl(weapon.icon_path_high)
        || MarathonAPI.getWeaponIconUrlBySlug(weapon.slug, 'high');
    const imgEl = document.getElementById('weaponImage');
    imgEl.src = iconUrl;
    imgEl.alt = weapon.name;
    imgEl.onerror = () => {
        if (imgEl.src.endsWith('.webp')) {
            imgEl.src = imgEl.src.replace('.webp', '.png');
        } else {
            imgEl.style.display = 'none';
        }
    };
    
    // Make image container clickable to open lightbox
    const imageContainer = imgEl.parentElement;
    imageContainer.style.cursor = 'pointer';
    imageContainer.addEventListener('click', () => openImageLightbox(iconUrl, weapon.name));
    
    // Name and description
    document.getElementById('weaponName').textContent = weapon.name;
    document.getElementById('weaponDescription').textContent = weapon.description || '';
    
    // Verified badge
    renderVerifiedBadge();
    
    // Category badge
    const categoryBadge = document.getElementById('categoryBadge');
    categoryBadge.textContent = weapon.category_name || weapon.category || 'Unknown';
    
    // Ammo type badge
    const ammoBadge = document.getElementById('ammoBadge');
    if (weapon.ammo_type) {
        const ammoIconHtml = weapon.ammo_icon_url ? `<img src="${weapon.ammo_icon_url}" alt="" class="ammo-badge-icon">` : '';
        ammoBadge.innerHTML = ammoIconHtml + escapeHtml(weapon.ammo_type);
        ammoBadge.className = `badge badge-ammo ammo-${getAmmoTypeClass(weapon.ammo_type)}`;
        ammoBadge.style.display = 'inline-flex';
    } else {
        ammoBadge.style.display = 'none';
    }
    
    // Season badge
    const seasonBadge = document.getElementById('seasonBadge');
    const stats = weapon.stats || {};
    if (stats.season_name) {
        seasonBadge.textContent = stats.season_name;
        seasonBadge.style.display = 'inline-flex';
    } else {
        seasonBadge.style.display = 'none';
    }
    
    // Populate weapon info sidebar
    renderWeaponInfoSidebar();
    
    // Render stats with bars
    renderStats();
    
    // Render mod equip section below stats first so mods data can be reused by the Mods tab.
    await renderModEquipSection();
    
    // Render mods tab
    renderMods();
    
    // Preload skins count
    preloadSkinsCount();
    
    // Render patch history (if available)
    renderPatchHistory();
    
    // Render stat history chart (if multiple seasons)
    renderStatHistoryChart();

    // Render community rating timeline chart
    renderRatingTimeline();
}

// Render verified badge next to weapon name
function renderVerifiedBadge() {
    const nameEl = document.getElementById('weaponName');
    if (!nameEl) return;
    
    // Remove any existing badge first (in case of re-render)
    const existing = nameEl.querySelector('.verified-badge');
    if (existing) existing.remove();
    
    const isVerified = weapon.verified === true || weapon.verified === 1;
    if (!isVerified) return;
    
    const badge = document.createElement('span');
    badge.className = 'verified-badge';
    badge.setAttribute('aria-label', 'Verified weapon data');
    badge.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" class="verified-icon">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
            <polyline points="22 4 12 14.01 9 11.01" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <div class="verified-tooltip">
            <div class="verified-tooltip-title">Verified Data</div>
            <div class="verified-tooltip-text">This weapon's stats have been directly extracted from the game and manually verified by the MarathonDB team.</div>
        </div>
    `;
    
    // Append badge inside the h1 so it flows inline with the name
    nameEl.appendChild(badge);
}

// Render weapon info sidebar items
function renderWeaponInfoSidebar() {
    const infoCard = document.querySelector('.weapon-info-card');
    if (!infoCard) return;
    
    const stats = weapon.stats || {};
    const items = [];
    if (weapon.type) items.push({ label: 'Type', value: weapon.type, icon: '◎' });
    if (weapon.ammo_type) items.push({ label: 'Ammo', value: weapon.ammo_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()), icon: '◆' });
    if (weapon.cost_credits) items.push({ label: 'Value', value: weapon.cost_credits.toLocaleString() + ' Credits', icon: '<img src="/assets/icons/credits.webp" alt="Credits" class="weapon-info-credits-icon" width="16" height="16">', isHtml: true });
    if (stats.season_name) items.push({ label: 'Season', value: stats.season_name + (stats.patch_version ? ` (${stats.patch_version})` : ''), icon: '📅' });
    
    if (items.length === 0) {
        infoCard.style.display = 'none';
        return;
    }
    
    const rowsContainer = infoCard.querySelector('.weapon-info-rows');
    if (rowsContainer) {
        rowsContainer.innerHTML = items.map(item => `
            <div class="weapon-info-row">
                <span class="weapon-info-icon">${item.icon}</span>
                <span class="weapon-info-label">${item.label}</span>
                <span class="weapon-info-value">${item.isHtml ? item.value : escapeHtml(item.value)}</span>
            </div>
        `).join('');
    }
}

// Render stats with progress bars — grouped into Core, Advanced, Handling, TTK
function renderStats() {
    const container = document.getElementById('statsContainer');
    const stats = weapon.stats || {};
    
    let html = '';

    // Helper to render a stat bar row
    function renderBarRow(config, cssClass) {
        let value = stats[config.key];
        if (config.altKey && stats[config.altKey] !== null && stats[config.altKey] !== undefined) {
            value = stats[config.altKey];
        }
        if (value === null || value === undefined) return '';
        let numericValue = parseFloat(String(value).replace(/[^0-9.]/g, ''));
        let displayValue = config.isRaw ? value : (value + config.suffix);
        let barPercent;
        if (config.inverse) {
            barPercent = Math.max(0, Math.min(100, ((config.maxValue - numericValue) / config.maxValue) * 100));
        } else {
            barPercent = Math.max(0, Math.min(100, (numericValue / config.maxValue) * 100));
        }
        return `
            <div class="stat-bar-row ${cssClass}" data-stat-key="${config.key}">
                <div class="stat-bar-label">${config.label}</div>
                <div class="stat-bar-track">
                    <div class="stat-bar-fill" style="width: ${barPercent}%"></div>
                </div>
                <div class="stat-bar-value">${displayValue}</div>
            </div>`;
    }

    // ── CORE STATS ──
    const coreConfigs = [
        { key: 'firepower_score', label: 'FIREPOWER', maxValue: 50, suffix: '' },
        { key: 'accuracy_score', label: 'ACCURACY', maxValue: 100, suffix: '' },
        { key: 'handling_score', label: 'HANDLING', maxValue: 100, suffix: '' },
        { key: 'range_meters', label: 'RANGE', maxValue: 200, suffix: 'm' },
        { key: 'magazine_size', label: 'MAGAZINE', maxValue: 60, suffix: '' },
        { key: 'zoom', label: 'ZOOM', maxValue: 5, suffix: '', isRaw: true }
    ];

    let coreHtml = '';
    for (const config of coreConfigs) {
        coreHtml += renderBarRow(config, 'stat-core');
    }
    if (coreHtml) {
        html += `<div class="stats-section-group">
            <div class="stats-section-label stats-section-label-core">CORE STATS</div>${coreHtml}
        </div>`;
    }

    // ── ADVANCED STATS ──
    const advancedConfigs = [
        { key: 'rate_of_fire', label: 'RATE OF FIRE', maxValue: 1200, suffix: '', isRaw: true },
        { key: 'reload_speed', label: 'RELOAD SPEED', maxValue: 5, suffix: 's', inverse: true },
        { key: 'aim_assist', label: 'AIM ASSIST', maxValue: 5, suffix: '' },
        { key: 'recoil', label: 'RECOIL', maxValue: 100, suffix: '%' },
        { key: 'precision', label: 'PRECISION', maxValue: 5, suffix: 'x' },
        { key: 'charge_time_seconds', label: 'CHARGE TIME', maxValue: 5, suffix: 's', inverse: true },
        { key: 'volt_drain', label: 'VOLT DRAIN', maxValue: 100, suffix: '%' },
        { key: 'damage', label: 'DAMAGE', maxValue: 150, suffix: '' },
        { key: 'weight', label: 'WEIGHT', maxValue: 100, suffix: '%' }
    ];

    // ── ACCURACY / HANDLING DETAILS (merged into Advanced) ──
    const handlingFields = [
        { key: 'hipfire_spread', label: 'Hipfire Spread', suffix: '°' },
        { key: 'ads_spread', label: 'ADS Spread', suffix: '°' },
        { key: 'crouch_spread_bonus', label: 'Crouch Spread Bonus', suffix: '%' },
        { key: 'moving_inaccuracy', label: 'Moving Inaccuracy', suffix: '%' },
        { key: 'equip_speed', label: 'Equip Speed', suffix: 's' },
        { key: 'ads_speed', label: 'ADS Speed', suffix: 's' }
    ];
    const hasHandling = handlingFields.filter(f => stats[f.key] !== null && stats[f.key] !== undefined);
    let handlingInnerHtml = '';
    if (hasHandling.length > 0) {
        handlingInnerHtml = `
        <div class="advanced-handling-divider"></div>
        <div class="stats-section-label stats-section-label-handling">ACCURACY &amp; HANDLING</div>
        <div class="handling-grid">
            ${hasHandling.map(f => `<div class="handling-item" data-stat-key="${f.key}">
                <span class="handling-label">${f.label}</span>
                <span class="handling-value">${stats[f.key]}${f.suffix}</span>
            </div>`).join('')}
        </div>`;
    }

    let advancedHtml = '';
    for (const config of advancedConfigs) {
        advancedHtml += renderBarRow(config, 'stat-advanced');
    }
    if (advancedHtml || handlingInnerHtml) {
        html += `<div class="stats-section-group">
            <button class="advanced-stats-toggle" onclick="toggleAdvancedStats(this)" aria-expanded="false" aria-controls="advancedStatsContent">
                <span class="stats-section-label stats-section-label-advanced">ADVANCED</span>
                <span class="advanced-toggle-hint">click to expand</span>
                <span class="advanced-toggle-arrow"><svg viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg></span>
            </button>
            <div class="advanced-stats-content collapsed" id="advancedStatsContent">${advancedHtml}${handlingInnerHtml}</div>
        </div>`;
    }
    
    container.innerHTML = html || '<p class="no-data">No stats available</p>';
}

// ===== MOD EQUIP SYSTEM (Stats Tab) =====

// Cache of fully-loaded mod details (slug → mod object with effects)
const modDetailCache = {};

// Load and render equippable mod slots below stats
async function renderModEquipSection() {
    const statsTab = document.getElementById('statsTabContent');
    if (!statsTab || !weapon) return;

    // Create or find the equip container
    let equipSection = document.getElementById('modEquipSection');
    if (!equipSection) {
        equipSection = document.createElement('div');
        equipSection.id = 'modEquipSection';
        equipSection.className = 'mod-equip-section';
        // Insert before the stat history chart so Equip Mods sits above it
        const historyChart = document.getElementById('statHistoryChart');
        if (historyChart) {
            statsTab.insertBefore(equipSection, historyChart);
        } else {
            statsTab.appendChild(equipSection);
        }
    }

    equipSection.innerHTML = `<div class="mod-equip-loading"><div class="loading-spinner"></div><span>Loading mods…</span></div>`;

    try {
        const res = await MarathonAPI.getModsForWeapon(weapon.slug);
        const modsObj = res?.data || res || {};

        weaponModSlots = modsObj;

        // Flatten mods from BOTH slots and unslotted_mods (deduplicated)
        const seen = new Set();
        const allMods = [];
        for (const slot of (modsObj.slots || [])) {
            for (const mod of (slot.mods || [])) {
                if (!seen.has(mod.slug)) { seen.add(mod.slug); allMods.push(mod); }
            }
        }
        for (const mod of (modsObj.unslotted_mods || [])) {
            if (!seen.has(mod.slug)) { seen.add(mod.slug); allMods.push(mod); }
        }

        if (allMods.length === 0) {
            equipSection.innerHTML = '<p class="no-data meq-empty">No compatible mods found for this weapon.</p>';
            return;
        }

        // Group mods by slot_type (like the loadout builder does)
        const slotOrder = ['optic', 'barrel', 'magazine', 'grip', 'chip', 'generator', 'shield'];
        const typeMap = {};
        for (const mod of allMods) {
            const t = mod.slot_type || mod.type || 'mod';
            if (!typeMap[t]) typeMap[t] = [];
            typeMap[t].push(mod);
        }

        const sortedTypes = Object.keys(typeMap).sort((a, b) => {
            const ia = slotOrder.indexOf(a);
            const ib = slotOrder.indexOf(b);
            return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
        });

        let slotsHtml = '';
        const allSlugs = [];
        for (const slotType of sortedTypes) {
            const mods = typeMap[slotType];

            const rarityOrder = ['prestige', 'superior', 'deluxe', 'enhanced', 'standard'];
            const sorted = [...mods].sort((a, b) => {
                const ra = rarityOrder.indexOf((a.rarity || 'enhanced').toLowerCase());
                const rb = rarityOrder.indexOf((b.rarity || 'enhanced').toLowerCase());
                if (ra !== rb) return ra - rb;
                return (a.name || '').localeCompare(b.name || '');
            });

            const slotIcon = MOD_SLOT_ICONS[slotType] || '';
            const slotLabel = formatStatName(slotType);

            slotsHtml += `
                <div class="meq-slot" data-slot-type="${slotType}">
                    <div class="meq-slot-header">
                        <span class="meq-slot-icon">${slotIcon}</span>
                        <span class="meq-slot-label">${slotLabel}</span>
                        <span class="meq-slot-count">${sorted.length}</span>
                    </div>
                    <div class="meq-slot-mods">
                        ${sorted.map(mod => {
                            allSlugs.push(mod.slug);
                            return renderEquipModCard(mod, slotType);
                        }).join('')}
                    </div>
                </div>`;
        }

        if (!slotsHtml) {
            equipSection.innerHTML = '<p class="no-data meq-empty">No compatible mods found.</p>';
            return;
        }

        equipSection.innerHTML = `
            <div class="meq-header">
                <div class="meq-title">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                    EQUIP MODS
                </div>
                <button class="meq-clear-btn" onclick="clearAllEquippedMods()" style="display:none" id="meqClearBtn">Clear All</button>
            </div>
            <p class="meq-hint">Select one mod per slot to preview stat changes in real time. <a href="/mods/" class="meq-cta-link">View all weapon mods &rarr;</a></p>
            ${slotsHtml}
        `;

        setupModEquipListeners();

        // Pre-fetch all mod details in the background (batches of 5)
        prefetchModDetails(allSlugs);

    } catch (err) {
        console.error('Failed to load mod equip section:', err);
        equipSection.innerHTML = '<p class="no-data meq-empty">Failed to load mods.</p>';
    }
}

// Prefetch mod details (effects) in batches so equip is instant
async function prefetchModDetails(slugs) {
    const toFetch = slugs.filter(s => !modDetailCache[s]);
    const failed = [];

    async function fetchBatches(list) {
        for (let i = 0; i < list.length; i += 5) {
            const batch = list.slice(i, i + 5);
            const results = await Promise.allSettled(
                batch.map(slug => MarathonAPI.getModBySlug(slug))
            );
            results.forEach((result, idx) => {
                if (result.status === 'fulfilled' && result.value) {
                    const detail = result.value?.data || result.value;
                    if (detail && detail.slug) {
                        modDetailCache[batch[idx]] = detail;
                        updateCardEffectsDisplay(batch[idx]);
                        return;
                    }
                }
                failed.push(batch[idx]);
            });
        }
    }

    await fetchBatches(toFetch);

    // Retry failed slugs once
    if (failed.length > 0) {
        const retryList = [...failed];
        failed.length = 0;
        await fetchBatches(retryList);
    }

    // Remove mods that have no effects data (unverified + no effects)
    document.querySelectorAll('.meq-card[data-mod-slug]').forEach(card => {
        const slug = card.getAttribute('data-mod-slug');
        const detail = modDetailCache[slug];
        const hasEffects = detail && resolveModEffects(detail).length > 0;
        if (!detail || (!detail.is_verified && !hasEffects)) {
            card.remove();
        }
    });

    // Update slot counts and remove empty slots
    document.querySelectorAll('.meq-slot').forEach(slot => {
        const remaining = slot.querySelectorAll('.meq-card');
        if (remaining.length === 0) {
            slot.remove();
        } else {
            const countEl = slot.querySelector('.meq-slot-count');
            if (countEl) countEl.textContent = remaining.length;
        }
    });
}

// Resolve effects for a mod, preferring per-weapon overrides
function resolveModEffects(mod) {
    if (!mod) return [];
    const compatWeapons = mod.compatible_weapons || [];
    for (const cw of compatWeapons) {
        const cwSlug = (typeof cw === 'object') ? cw.weapon_slug : null;
        if (cwSlug === weapon.slug && cw.effects && cw.effects.length > 0) {
            return cw.effects;
        }
    }
    return mod.effects || [];
}

// Update a card's effect chips once we have the detail
function updateCardEffectsDisplay(slug) {
    const cards = document.querySelectorAll(`.meq-card[data-mod-slug="${slug}"]`);
    if (cards.length === 0) return;
    const mod = modDetailCache[slug];
    const effects = resolveModEffects(mod);

    cards.forEach(card => {
        const effectsEl = card.querySelector('.meq-card-effects');
        if (!effectsEl) return;

        if (effects.length === 0) {
            effectsEl.innerHTML = '<span class="meq-effect-empty">—</span>';
            return;
        }

        const visible = effects.slice(0, 3);
        const extra = effects.length - 3;

        const chips = visible.map(eff => {
            if (eff.stat_key == null || eff.delta == null) return '';
            const sign = eff.delta >= 0 ? '+' : '';
            let suffix = '';
            if (eff.unit === 'percent') suffix = '%';
            else if (eff.unit === 'degrees') suffix = '°';
            else if (eff.unit === 'seconds') suffix = 's';
            return `<span class="meq-effect buff">${sign}${eff.delta}${suffix} ${formatStatName(eff.stat_key)}</span>`;
        }).join('');

        const moreChip = extra > 0 ? `<span class="meq-effect more">+${extra}</span>` : '';
        effectsEl.innerHTML = chips + moreChip;
    });
}

// Render a single compact equippable mod card
function renderEquipModCard(mod, slotType) {
    const rarityClass = (mod.rarity || 'enhanced').toLowerCase();

    // If we already have cached details, show effects immediately
    const cached = modDetailCache[mod.slug];
    const effects = cached ? resolveModEffects(cached) : [];

    const visible = effects.slice(0, 3);
    const extra = effects.length - 3;

    const effectChips = visible.map(eff => {
        if (eff.stat_key == null || eff.delta == null) return '';
        const sign = eff.delta >= 0 ? '+' : '';
        let suffix = '';
        if (eff.unit === 'percent') suffix = '%';
        else if (eff.unit === 'degrees') suffix = '°';
        else if (eff.unit === 'seconds') suffix = 's';
        return `<span class="meq-effect buff">${sign}${eff.delta}${suffix} ${formatStatName(eff.stat_key)}</span>`;
    }).join('');

    const moreChip = extra > 0 ? `<span class="meq-effect more">+${extra}</span>` : '';

    return `
        <button class="meq-card" data-mod-slug="${mod.slug}" data-slot-type="${slotType}" data-rarity="${rarityClass}" title="${escapeHtml(mod.name)}">
            <div class="meq-card-top">
                <span class="meq-card-name">${escapeHtml(mod.name)}</span>
            </div>
            <div class="meq-card-effects">${effectChips || moreChip || '<span class="meq-effect-loading">loading effects…</span>'}</div>
            <div class="meq-card-equipped-indicator">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
                Equipped
            </div>
        </button>`;
}

// Wire up click events on mod equip cards
function setupModEquipListeners() {
    document.querySelectorAll('.meq-card').forEach(card => {
        card.addEventListener('click', () => {
            const slug = card.dataset.modSlug;
            const slotType = card.dataset.slotType;
            toggleEquipMod(slug, slotType);
        });
    });
}

// Toggle equipping a mod — fetches detail if not cached
async function toggleEquipMod(modSlug, slotType) {
    if (!weaponModSlots) return;

    // If already equipped in this slot, unequip
    if (equippedMods[slotType]?.slug === modSlug) {
        delete equippedMods[slotType];
        updateEquipCardStates();
        applyEquippedModEffects();
        return;
    }

    // Need full mod data with effects — fetch if not cached
    let modDetail = modDetailCache[modSlug];
    if (!modDetail) {
        // Show loading state on the card
        const card = document.querySelector(`.meq-card[data-mod-slug="${modSlug}"]`);
        if (card) card.classList.add('meq-loading');

        try {
            const resp = await MarathonAPI.getModBySlug(modSlug);
            const detail = resp?.data || resp;
            if (detail && detail.slug) {
                modDetail = detail;
                modDetailCache[modSlug] = modDetail;
                updateCardEffectsDisplay(modSlug);
            }
        } catch (e) {
            console.warn('Failed to fetch mod detail:', e);
        }

        if (card) card.classList.remove('meq-loading');
    }

    if (!modDetail) {
        // Fall back to basic mod data from slots or unslotted_mods (no effects)
        for (const slot of (weaponModSlots.slots || [])) {
            const found = (slot.mods || []).find(m => m.slug === modSlug);
            if (found) { modDetail = found; break; }
        }
        if (!modDetail) {
            modDetail = (weaponModSlots.unslotted_mods || []).find(m => m.slug === modSlug);
        }
    }

    if (!modDetail) return;

    equippedMods[slotType] = modDetail;
    updateEquipCardStates();
    applyEquippedModEffects();
}

// Update visual state of all equip cards
function updateEquipCardStates() {
    const equippedSlugs = new Set(Object.values(equippedMods).map(m => m.slug));
    const equippedSlotTypes = new Set(Object.keys(equippedMods));

    document.querySelectorAll('.meq-card').forEach(card => {
        const slug = card.dataset.modSlug;
        const slot = card.dataset.slotType;
        const isEquipped = equippedSlugs.has(slug);
        const slotTaken = equippedSlotTypes.has(slot) && !isEquipped;

        card.classList.toggle('equipped', isEquipped);
        card.classList.toggle('slot-taken', slotTaken);
    });

    const clearBtn = document.getElementById('meqClearBtn');
    if (clearBtn) {
        clearBtn.style.display = Object.keys(equippedMods).length > 0 ? '' : 'none';
    }
}

// Clear all equipped mods
window.clearAllEquippedMods = function() {
    equippedMods = {};
    updateEquipCardStates();
    applyEquippedModEffects();
};

// Apply all equipped mod effects to stat bars in real-time
function applyEquippedModEffects() {
    if (!weapon || !weapon.stats) return;
    const baseStats = weapon.stats;

    // Collect deltas from all equipped mods
    const deltas = {};
    for (const mod of Object.values(equippedMods)) {
        // Prefer per-weapon effect overrides
        let effects = mod.effects || [];
        const compatWeapons = mod.compatible_weapons || [];
        for (const cw of compatWeapons) {
            const cwSlug = (typeof cw === 'object' && cw !== null) ? cw.weapon_slug : null;
            if (cwSlug === weapon.slug && cw.effects && cw.effects.length > 0) {
                effects = cw.effects;
                break;
            }
        }

        for (const eff of effects) {
            if (eff.stat_key == null || eff.delta == null) continue;
            const weaponStatKey = EFFECT_TO_STAT_KEY[eff.stat_key] || eff.stat_key;
            if (!deltas[weaponStatKey]) deltas[weaponStatKey] = { additive: 0, percent: 0 };
            if (eff.unit === 'percent') {
                deltas[weaponStatKey].percent += eff.delta;
            } else {
                deltas[weaponStatKey].additive += eff.delta;
            }
        }
    }

    const allConfigs = [...STAT_IMPACT_CONFIGS];
    const hasAnyMods = Object.keys(equippedMods).length > 0;

    for (const config of allConfigs) {
        const row = document.querySelector(`.stat-bar-row[data-stat-key="${config.key}"]`);
        if (!row) continue;

        const baseValue = parseFloat(baseStats[config.key]);
        if (isNaN(baseValue)) continue;

        const d = deltas[config.key];
        let modifiedValue = baseValue;
        if (d) {
            modifiedValue = baseValue + (baseValue * d.percent / 100) + d.additive;
        }

        const fillEl = row.querySelector('.stat-bar-fill');
        const valueEl = row.querySelector('.stat-bar-value');
        if (!fillEl || !valueEl) continue;

        let barPercent;
        if (config.inverse) {
            barPercent = Math.max(0, Math.min(100, ((config.maxValue - modifiedValue) / config.maxValue) * 100));
        } else {
            barPercent = Math.max(0, Math.min(100, (modifiedValue / config.maxValue) * 100));
        }

        fillEl.style.width = barPercent + '%';

        const suffix = config.suffix || '';
        let displayVal;
        if (config.isRaw) {
            displayVal = d ? modifiedValue.toFixed(1).replace(/\.0$/, '') : String(baseValue);
        } else {
            displayVal = d ? (modifiedValue.toFixed(1).replace(/\.0$/, '') + suffix) : (baseValue + suffix);
        }
        valueEl.textContent = displayVal;

        if (d && hasAnyMods) {
            row.classList.add('stat-modded-buff');
            row.classList.remove('stat-modded-nerf');

            let existingDelta = row.querySelector('.stat-bar-delta');
            if (!existingDelta) {
                existingDelta = document.createElement('div');
                existingDelta.className = 'stat-bar-delta';
                row.querySelector('.stat-bar-track').appendChild(existingDelta);
            }
            const basePct = config.inverse
                ? Math.max(0, Math.min(100, ((config.maxValue - baseValue) / config.maxValue) * 100))
                : Math.max(0, Math.min(100, (baseValue / config.maxValue) * 100));
            const minP = Math.min(basePct, barPercent);
            const maxP = Math.max(basePct, barPercent);
            existingDelta.style.left = minP + '%';
            existingDelta.style.width = (maxP - minP) + '%';
            existingDelta.className = 'stat-bar-delta delta-buff';
        } else {
            row.classList.remove('stat-modded-buff', 'stat-modded-nerf');
            const existingDelta = row.querySelector('.stat-bar-delta');
            if (existingDelta) existingDelta.remove();
        }
    }

    // Update handling grid items
    const handlingConfigs = [
        { key: 'hipfire_spread', suffix: '°' }, { key: 'ads_spread', suffix: '°' },
        { key: 'crouch_spread_bonus', suffix: '%' }, { key: 'moving_inaccuracy', suffix: '%' },
        { key: 'equip_speed', suffix: 's' }, { key: 'ads_speed', suffix: 's' },
    ];
    for (const hc of handlingConfigs) {
        const el = document.querySelector(`.handling-item[data-stat-key="${hc.key}"]`);
        if (!el) continue;
        const baseVal = parseFloat(baseStats[hc.key]);
        if (isNaN(baseVal)) continue;
        const d = deltas[hc.key];
        const valEl = el.querySelector('.handling-value');
        if (!valEl) continue;
        if (d && hasAnyMods) {
            const modified = baseVal + (baseVal * d.percent / 100) + d.additive;
            valEl.textContent = modified.toFixed(2).replace(/\.?0+$/, '') + hc.suffix;
            el.classList.add('stat-modded-buff');
            el.classList.remove('stat-modded-nerf');
        } else {
            valEl.textContent = baseVal + hc.suffix;
            el.classList.remove('stat-modded-buff', 'stat-modded-nerf');
        }
    }
}

// Render mods with enhanced details
let modsData = [];
let filteredMods = [];

async function renderMods() {
    const section = document.getElementById('modsSection');
    const list = document.getElementById('modsList');
    const countBadge = document.getElementById('modsCount');
    
    // Always show the section since it's now in its own tab
    section.style.display = 'block';
    
    // Show loading state
    list.innerHTML = '<div class="mods-loading"><div class="loading-spinner"></div><span>Loading mod details...</span></div>';
    
    try {
        // Reuse cached mod data from equip section if available, else fetch
        const weaponModsRes = weaponModSlots
            ? { data: weaponModSlots }
            : await MarathonAPI.getModsForWeapon(weapon.slug);
        const modsResData = weaponModsRes?.data || weaponModsRes;

        if (!modsResData) {
            list.innerHTML = '<p class="no-data">No compatible mods available for this weapon.</p>';
            return;
        }

        // Flatten mods from all slots + unslotted, deduplicated
        const seen = new Set();
        const compatibleMods = [];
        for (const slot of (modsResData.slots || [])) {
            for (const mod of (slot.mods || [])) {
                if (!seen.has(mod.slug)) { seen.add(mod.slug); compatibleMods.push(mod); }
            }
        }
        for (const mod of (modsResData.unslotted_mods || [])) {
            if (!seen.has(mod.slug)) { seen.add(mod.slug); compatibleMods.push(mod); }
        }
        
        if (compatibleMods.length === 0) {
            list.innerHTML = '<p class="no-data">No compatible mods available for this weapon.</p>';
            return;
        }
        
        // Enrich mods with cached detail data and exclude unverified
        modsData = compatibleMods.filter(mod => {
            const detail = modDetailCache[mod.slug];
            if (detail) {
                const resolved = resolveModEffects(detail);
                mod.effects = resolved.length > 0 ? resolved : (detail.effects || mod.effects);
                mod.ability_name = detail.ability_name || mod.ability_name;
                mod.ability_description = detail.ability_description || mod.ability_description;
                mod.cost = detail.cost != null ? detail.cost : mod.cost;
                // Hide mods that are unverified and have no effects
                if (!detail.is_verified && resolved.length === 0) return false;
            }
            return true;
        });
        filteredMods = [...modsData];

        // Update mods count badge (after filtering)
        if (countBadge) {
            countBadge.textContent = modsData.length;
            countBadge.style.display = 'inline-flex';
        }
        
        // Setup filter listeners (selects are in static HTML)
        setupModFilters();
        
        // Populate slot type filter with actual types from data
        populateTypeFilter();
        
        // Render the enhanced mods UI
        renderModsUI();
    } catch (error) {
        console.error('Error loading mods:', error);
        list.innerHTML = '<p class="no-data">Failed to load mods. Please try again later.</p>';
    }
}

// Render the mods UI with filters and rarity-grouped cards
function renderModsUI() {
    const list = document.getElementById('modsList');
    
    // Preserve current filter values before re-rendering
    const currentType = document.getElementById('modTypeFilter')?.value || '';
    const currentRarity = document.getElementById('modRarityFilter')?.value || '';
    
    // Sort mods: by rarity tier (highest first), then alphabetically
    const rarityOrder = { prestige: 0, superior: 1, deluxe: 2, enhanced: 3, standard: 4 };
    const sortedMods = [...filteredMods].sort((a, b) => {
        const ra = rarityOrder[(a.rarity || 'enhanced').toLowerCase()] ?? 3;
        const rb = rarityOrder[(b.rarity || 'enhanced').toLowerCase()] ?? 3;
        if (ra !== rb) return ra - rb;
        return (a.name || '').localeCompare(b.name || '');
    });

    // Build flat mods grid (no rarity grouping)
    let modsHTML = '';
    if (sortedMods.length > 0) {
        modsHTML = sortedMods.map(mod => createModCard(mod)).join('');
    } else {
        modsHTML = '<p class="no-data">No mods match your filters.</p>';
    }
    
    list.innerHTML = modsHTML;
    
    // Restore filter values
    const typeFilter = document.getElementById('modTypeFilter');
    const rarityFilter = document.getElementById('modRarityFilter');
    if (typeFilter) typeFilter.value = currentType;
    if (rarityFilter) rarityFilter.value = currentRarity;
    
    // Setup event listeners
    setupModsEventListeners();
}

// Group mods by rarity (highest first)
function groupModsByRarity(mods) {
    const groups = {
        'Prestige': [],
        'Superior': [],
        'Deluxe': [],
        'Enhanced': [],
        'Standard': []
    };
    
    mods.forEach(mod => {
        // Normalize rarity: API returns lowercase, UI expects title-case
        const raw = mod.rarity || 'enhanced';
        const rarity = raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
        if (groups[rarity]) {
            groups[rarity].push(mod);
        } else {
            groups['Enhanced'].push(mod);
        }
    });
    
    return groups;
}

// Format a single effect for display
function formatModEffect(effect) {
    // New API format: { stat_key, delta, unit }
    if (effect.stat_key != null && effect.delta != null) {
        const label = formatStatName(effect.stat_key);
        const sign = effect.delta >= 0 ? '+' : '';
        let suffix = '';
        if (effect.unit === 'percent') suffix = '%';
        else if (effect.unit === 'degrees') suffix = '°';
        else if (effect.unit === 'seconds') suffix = 's';
        const display = `${sign}${effect.delta}${suffix}`;
        const isPositive = effect.delta >= 0;
        return { label, display, isPositive };
    }
    // Legacy fallback
    const label = formatStatName(effect.stat_name || effect.stat_key || 'Unknown');
    const display = effect.stat_modifier || effect.display_text || String(effect.delta);
    const isPositive = display.includes('+') || display.includes('increase');
    return { label, display, isPositive };
}

// Create an enhanced mod card
function createModCard(mod) {
    const rarityClass = (mod.rarity || 'enhanced').toLowerCase();
    const iconUrl = mod.icon_url || mod.icon_url_webp || '';
    const slotLabel = mod.slot_type ? formatStatName(mod.slot_type) : 'Mod';
    
    // Build effects list
    const effects = mod.effects || [];
    const effectsHTML = effects.length > 0 ? effects.map(effect => {
        const { label, display, isPositive } = formatModEffect(effect);
        const effectClass = isPositive ? 'positive' : 'negative';
        return `<div class="mod-effect ${effectClass}">
            <span class="effect-stat">${label}</span>
            <span class="effect-value">${display}</span>
        </div>`;
    }).join('') : '<div class="mod-effect-none">No stat modifications</div>';
    
    // Build ability section if present
    const abilityHTML = mod.ability_name ? `
        <div class="mod-meta-row">
            <span class="mod-meta-label">Ability:</span>
            <span class="mod-meta-value">${escapeHtml(mod.ability_name)}</span>
        </div>
        ${mod.ability_description ? `<p class="mod-ability-desc">${escapeHtml(mod.ability_description)}</p>` : ''}
    ` : '';
    
    return `
        <div class="mod-card" data-mod-slug="${mod.slug}" data-rarity="${rarityClass}">
            <div class="mod-card-header">
                <div class="mod-icon-container">
                    ${iconUrl ? `<img src="${iconUrl}" alt="${escapeHtml(mod.name)}" class="mod-icon" onerror="this.parentElement.classList.add('icon-fallback')" loading="lazy">` : '<div class="mod-icon icon-fallback"></div>'}
                </div>
                <div class="mod-card-info">
                    <h5 class="mod-name">${escapeHtml(mod.name)}</h5>
                    <span class="mod-type-badge">${slotLabel}</span>
                </div>
            </div>
            
            <div class="mod-details">
                <div class="mod-effects">
                    <span class="mod-section-label">Effects:</span>
                    ${effectsHTML}
                </div>
                
                ${abilityHTML}
                
                ${mod.cost ? `<div class="mod-meta-row">
                    <span class="mod-meta-label">Value:</span>
                    <span class="mod-meta-value">${mod.cost.toLocaleString()} Credits</span>
                </div>` : ''}
                
                ${effects.length > 0 ? `
                <div class="mod-actions">
                    <button class="mod-preview-btn" data-mod-slug="${mod.slug}">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/>
                        </svg>
                        Preview Stats Impact
                    </button>
                </div>` : ''}
            </div>
            
            <!-- Tooltip for desktop -->
            <div class="mod-tooltip">
                <div class="mod-tooltip-content">
                    <strong>${escapeHtml(mod.name)}</strong>
                    <div class="tooltip-effects">${effectsHTML}</div>
                </div>
            </div>
        </div>
    `;
}

// Format stat names for display
function formatStatName(statName) {
    return statName
        .replace(/_/g, ' ')
        .replace(/\b\w/g, l => l.toUpperCase());
}

// Setup event listeners for mods tab
function setupModsEventListeners() {
    
    // Click mod card to open detail modal
    const modCards = document.querySelectorAll('.mod-card');
    modCards.forEach(card => {
        card.style.cursor = 'pointer';
        card.addEventListener('click', (e) => {
            // Don't open modal if clicking the preview stats button
            if (e.target.closest('.mod-preview-btn')) return;
            
            const slug = card.dataset.modSlug;
            if (slug) openWeaponModModal(slug);
        });
    });
    
    // Setup preview stats buttons
    const previewButtons = document.querySelectorAll('.mod-preview-btn');
    previewButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const modSlug = btn.dataset.modSlug;
            previewModStats(modSlug);
        });
    });
}

// Setup filter listeners (static HTML selects)
function setupModFilters() {
    const typeFilter = document.getElementById('modTypeFilter');
    const rarityFilter = document.getElementById('modRarityFilter');
    
    if (typeFilter) {
        typeFilter.addEventListener('change', filterAndSortMods);
    }
    if (rarityFilter) {
        rarityFilter.addEventListener('change', filterAndSortMods);
    }
}

// Populate type filter with actual slot types from loaded mod data
function populateTypeFilter() {
    const typeFilter = document.getElementById('modTypeFilter');
    if (!typeFilter || modsData.length === 0) return;
    
    const types = [...new Set(modsData.map(m => m.slot_type).filter(Boolean))].sort();
    
    typeFilter.innerHTML = '<option value="">All Types</option>' + 
        types.map(t => `<option value="${t}">${formatStatName(t)}</option>`).join('');
    
    // Also populate rarity filter dynamically to include all rarities present
    const rarityFilter = document.getElementById('modRarityFilter');
    if (!rarityFilter) return;
    
    const rarityOrder = ['enhanced', 'deluxe', 'superior', 'prestige'];
    const rarities = [...new Set(modsData.map(m => (m.rarity || '').toLowerCase()).filter(Boolean))];
    rarities.sort((a, b) => rarityOrder.indexOf(a) - rarityOrder.indexOf(b));
    
    rarityFilter.innerHTML = '<option value="">All Rarities</option>' + 
        rarities.map(r => `<option value="${r}">${r.charAt(0).toUpperCase() + r.slice(1)}</option>`).join('');
}

// Filter and sort mods based on user inputs
function filterAndSortMods() {
    const typeFilter = document.getElementById('modTypeFilter')?.value || '';
    const rarityFilter = document.getElementById('modRarityFilter')?.value || '';
    
    // Filter (hide unverified mods with no effects)
    filteredMods = modsData.filter(mod => {
        const detail = modDetailCache[mod.slug];
        if (detail && !detail.is_verified && resolveModEffects(detail).length === 0) return false;
        const matchesType = !typeFilter || mod.slot_type === typeFilter;
        // Compare case-insensitively since API returns lowercase rarity
        const matchesRarity = !rarityFilter || (mod.rarity || '').toLowerCase() === rarityFilter.toLowerCase();
        return matchesType && matchesRarity;
    });
    
    // Sort by name within each rarity group
    filteredMods.sort((a, b) => a.name.localeCompare(b.name));
    
    // Re-render
    renderModsUI();
}

// Preview mod stats impact
function previewModStats(modSlug) {
    const mod = modsData.find(m => m.slug === modSlug);
    if (!mod || !mod.effects || mod.effects.length === 0) return;
    
    // Create and show modal
    const modal = document.createElement('div');
    modal.className = 'stat-preview-modal';
    modal.innerHTML = `
        <div class="stat-preview-overlay"></div>
        <div class="stat-preview-content">
            <div class="stat-preview-header">
                <h3>Stats Preview: ${escapeHtml(mod.name)}</h3>
                <button class="stat-preview-close">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"/>
                        <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                </button>
            </div>
            <div class="stat-preview-body">
                <p class="stat-preview-description">This mod affects the following stats:</p>
                <div class="stat-preview-comparison">
                    ${mod.effects.map(effect => {
                        const { label, display, isPositive } = formatModEffect(effect);
                        const effectClass = isPositive ? 'positive' : 'negative';
                        const icon = isPositive ? '↑' : '↓';
                        return `
                            <div class="stat-preview-row ${effectClass}">
                                <span class="stat-preview-name">${label}</span>
                                <div class="stat-preview-change">
                                    <span class="stat-preview-icon">${icon}</span>
                                    <span class="stat-preview-modifier">${display}</span>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
                <div class="stat-preview-note">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>
                    </svg>
                    <span>Switch to the Stats tab to see current weapon values</span>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';
    
    // Close handlers
    const closeModal = () => {
        modal.remove();
        document.body.style.overflow = '';
    };
    
    modal.querySelector('.stat-preview-overlay').addEventListener('click', closeModal);
    modal.querySelector('.stat-preview-close').addEventListener('click', closeModal);
    
    const escHandler = (e) => {
        if (e.key === 'Escape') {
            closeModal();
            document.removeEventListener('keydown', escHandler);
        }
    };
    document.addEventListener('keydown', escHandler);
}

// Render patch history from weapon_patch_notes in the stats array (per season)
function renderPatchHistory() {
    const section = document.getElementById('patchHistory');
    const list = document.getElementById('patchList');
    
    if (!section || !list) return;
    
    // Build patch notes from the weapon stats history (new Weapons API format)
    // Each season entry may have weapon_patch_notes and/or patch_notes
    const patchEntries = [];
    
    if (Array.isArray(weaponHistory)) {
        for (const stat of weaponHistory) {
            if (stat.weapon_patch_notes) {
                patchEntries.push({
                    season_name: stat.season_name || `Season ${stat.season_id}`,
                    patch_version: stat.patch_version || stat.season_version || null,
                    season_type: stat.season_type || 'season',
                    is_current: stat.is_current || false,
                    notes: stat.weapon_patch_notes,
                    release_date: stat.release_date || null
                });
            }
        }
    }
    
    // Also keep legacy support for old patch_notes / changes arrays
    const legacyNotes = weapon.patch_notes || weapon.changes || [];
    
    if (patchEntries.length === 0 && legacyNotes.length === 0) {
        section.style.display = 'none';
        return;
    }
    
    section.style.display = 'block';
    
    let html = '';
    
    // Render new API patch notes (per-season weapon_patch_notes)
    if (patchEntries.length > 0) {
        // Show most recent first
        const reversed = [...patchEntries].reverse();
        
        html += reversed.map((entry, idx) => {
            const changeType = getChangeType(entry.notes);
            const changeIcon = changeType === 'buff' ? '▲' : (changeType === 'nerf' ? '▼' : (changeType === 'rework' ? '⟳' : '•'));
            const dateLabel = entry.release_date ? formatDate(entry.release_date) : '';
            const isCurrent = entry.is_current;
            
            // Split multiple notes on period or semicolon for individual display
            const noteLines = entry.notes.split(/(?<=[.;])\s+/).filter(Boolean);
            
            return `
                <div class="patch-item patch-${changeType}${isCurrent ? ' patch-current' : ''}">
                    <div class="patch-header">
                        <div class="patch-type-badge patch-type-${changeType}">${changeIcon} ${changeType.charAt(0).toUpperCase() + changeType.slice(1)}</div>
                        <div class="patch-meta">
                            <span class="patch-season">${escapeHtml(entry.season_name)}</span>
                            ${entry.patch_version ? `<span class="patch-version">${escapeHtml(entry.patch_version)}</span>` : ''}
                            ${dateLabel ? `<span class="patch-date">${dateLabel}</span>` : ''}
                            ${isCurrent ? '<span class="patch-current-badge">Current</span>' : ''}
                        </div>
                    </div>
                    <div class="patch-changes">
                        ${noteLines.map(line => `<div class="patch-change ${changeType}"><span class="change-text">${escapeHtml(line.trim())}</span></div>`).join('')}
                    </div>
                </div>`;
        }).join('');
    }
    
    // Render legacy patch notes if present
    if (legacyNotes.length > 0) {
        html += legacyNotes.map(patch => {
            const changeType = patch.change_type || getChangeType(patch.description || patch.title || '');
            const changeIcon = changeType === 'buff' ? '▲' : (changeType === 'nerf' ? '▼' : (changeType === 'rework' ? '⟳' : (changeType === 'bugfix' ? '🔧' : '•')));
            const seasonLabel = patch.season_name || patch.version || patch.season || '';
            const versionLabel = patch.season_version || patch.patch_version || '';
            const dateLabel = patch.date ? formatDate(patch.date) : '';
            const changes = patch.changes || [patch.description || patch.title].filter(Boolean);

            let affectedHtml = '';
            if (patch.affected_stats) {
                try {
                    const stats = typeof patch.affected_stats === 'string' ? JSON.parse(patch.affected_stats) : patch.affected_stats;
                    affectedHtml = `<div class="patch-affected-stats">${stats.map(s => `<span class="affected-stat-tag">${escapeHtml(s)}</span>`).join('')}</div>`;
                } catch (e) { /* ignore parse errors */ }
            }

            return `
                <div class="patch-item patch-${changeType}">
                    <div class="patch-header">
                        <div class="patch-type-badge patch-type-${changeType}">${changeIcon} ${changeType.charAt(0).toUpperCase() + changeType.slice(1)}</div>
                        <div class="patch-meta">
                            ${seasonLabel ? `<span class="patch-season">${escapeHtml(seasonLabel)}</span>` : ''}
                            ${versionLabel ? `<span class="patch-version">${escapeHtml(versionLabel)}</span>` : ''}
                            ${dateLabel ? `<span class="patch-date">${dateLabel}</span>` : ''}
                        </div>
                    </div>
                    ${patch.title ? `<div class="patch-title">${escapeHtml(patch.title)}</div>` : ''}
                    <div class="patch-changes">
                        ${changes.map(change => `<div class="patch-change ${changeType}"><span class="change-text">${escapeHtml(change)}</span></div>`).join('')}
                    </div>
                    ${affectedHtml}
                </div>`;
        }).join('');
    }
    
    list.innerHTML = html;
}

// Get change type (buff/nerf/change)
function getChangeType(text) {
    const lower = (text || '').toLowerCase();

    const buffWords = ['buff', 'improved', 'added', 'gained'];
    const nerfWords = ['nerf', 'reduced', 'decreased', 'lowered', 'removed', 'falls off'];

    // "increased" / "decrease" are context-dependent:
    //   "Increased damage"   → buff
    //   "Increased recoil"   → nerf (negative stat going up)
    //   "Increased duration … required" → nerf (longer wait)
    const negativeStats = /(?:recoil|spread|weight|drain|sway|flinch|duration.*required|time.*required|delay|cooldown|charge.?time)/;

    let buffScore = 0;
    let nerfScore = 0;

    // Split on sentence boundaries for per-line analysis
    const lines = lower.split(/[.\n]+/).filter(Boolean);
    for (const line of lines) {
        const hasIncrease = /\bincrease[ds]?\b/.test(line);
        const hasDecrease = /\bdecrease[ds]?\b/.test(line);
        const hitsNegStat = negativeStats.test(line);

        if (hasIncrease) { hitsNegStat ? nerfScore++ : buffScore++; }
        if (hasDecrease) { hitsNegStat ? buffScore++ : nerfScore++; }

        for (const w of buffWords) { if (line.includes(w)) buffScore++; }
        for (const w of nerfWords) { if (line.includes(w)) nerfScore++; }
    }

    if (nerfScore > buffScore) return 'nerf';
    if (buffScore > nerfScore) return 'buff';
    if (nerfScore > 0) return 'nerf';
    if (buffScore > 0) return 'buff';
    return 'change';
}

// Get change icon
function getChangeIcon(text) {
    const type = getChangeType(text);
    if (type === 'buff') return '↑';
    if (type === 'nerf') return '↓';
    return '•';
}

// Format date
function formatDate(dateStr) {
    try {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    } catch {
        return dateStr;
    }
}

// Show error state
function showError() {
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('errorState').style.display = 'flex';
}

// Escape HTML
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Get ammo type CSS class
function getAmmoTypeClass(ammoType) {
    if (!ammoType) return 'default';
    const type = ammoType.toLowerCase();
    if (type.includes('heavy')) return 'heavy';
    if (type.includes('light')) return 'light';
    if (type.includes('special')) return 'special';
    if (type.includes('volt') || type.includes('energy')) return 'volt';
    return 'default';
}

// Setup event listeners
function setupEventListeners() {
    // Rating category buttons
    document.querySelectorAll('.rating-category-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.rating-category-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            selectedRatingCategory = btn.dataset.category;
            // Would load ratings for this category from API
            loadRatings();
        });
    });
}

// Render season/patch version selector (button tabs like runner pages)
function renderSeasonSelector() {
    const selector = document.getElementById('statsVersionSelector');
    
    if (!selector || weaponHistory.length <= 1) {
        if (selector) selector.style.display = 'none';
        return;
    }
    
    selector.style.display = 'flex';
    
    let buttonsHtml = weaponHistory.map(stat => {
        const label = stat.season_name || stat.patch_version || `Season ${stat.season_id}`;
        const isActive = stat.season_id === currentSeasonId;
        return `<button class="stat-version-btn${isActive ? ' active' : ''}" onclick="selectWeaponStatVersion(${stat.season_id})">${escapeHtml(label)}</button>`;
    }).join('');
    
    selector.innerHTML = buttonsHtml;
}

// Global handler for season version buttons
window.selectWeaponStatVersion = function(seasonId) {
    switchSeason(seasonId);
    renderSeasonSelector(); // re-render to update active state
};

// Switch to different season stats
function switchSeason(seasonId) {
    const seasonStats = weaponHistory.find(s => s.season_id === seasonId);
    if (!seasonStats) return;
    
    currentSeasonId = seasonId;
    weapon.stats = seasonStats;
    
    // Update season badge
    const seasonBadge = document.getElementById('seasonBadge');
    if (seasonStats.season_name) {
        seasonBadge.textContent = seasonStats.season_name;
        seasonBadge.style.display = 'inline-flex';
    }
    
    // Re-render stats
    renderStats();
    
    // Re-apply equipped mod effects to new base stats
    applyEquippedModEffects();
    
}

// Toggle advanced stats visibility
window.toggleAdvancedStats = function(btn) {
    btn.classList.toggle('open');
    const content = btn.nextElementSibling || btn.parentElement.querySelector('.advanced-stats-content');
    if (content) {
        content.classList.toggle('collapsed');
    }
    btn.setAttribute('aria-expanded', btn.classList.contains('open'));
};

// Setup rating widget
function setupRatingInteraction() {
    initRatingWidget();
}

// Initialize the community rating widget
function initRatingWidget() {
    const container = document.getElementById('weaponRatingWidget');
    if (!container || !weapon?.slug) return;
    
    // Check if RatingWidget is available
    if (typeof RatingWidget === 'undefined') {
        console.warn('RatingWidget not loaded');
        return;
    }
    
    // Create the rating widget
    new RatingWidget(container, weapon.slug, {
        type: 'weapon',
        showDistribution: true,
        showVoteCount: true,
        onRatingChange: (rating, aggregate) => {
            console.log(`Rating updated: ${rating} stars, new average: ${aggregate.average_rating}`);
        }
    });
}

// ===== TAB NAVIGATION =====

function setupTabNavigation() {
    const tabContainer = document.querySelector('.weapon-tabs');
    const tabs = document.querySelectorAll('.weapon-tab');
    
    // Add ARIA roles
    if (tabContainer) tabContainer.setAttribute('role', 'tablist');
    tabs.forEach(tab => {
        const targetTab = tab.dataset.tab;
        const isActive = tab.classList.contains('active');
        tab.setAttribute('role', 'tab');
        tab.setAttribute('aria-selected', isActive);
        tab.setAttribute('aria-controls', `${targetTab}TabContent`);
        tab.id = tab.id || `${targetTab}TabBtn`;
    });
    document.querySelectorAll('.weapon-tab-content').forEach(panel => {
        panel.setAttribute('role', 'tabpanel');
        const tabId = panel.id.replace('TabContent', '');
        panel.setAttribute('aria-labelledby', `${tabId}TabBtn`);
    });

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetTab = tab.dataset.tab;
            
            // Update active tab
            tabs.forEach(t => {
                t.classList.remove('active');
                t.setAttribute('aria-selected', 'false');
            });
            tab.classList.add('active');
            tab.setAttribute('aria-selected', 'true');
            
            // Update active content
            document.querySelectorAll('.weapon-tab-content').forEach(content => {
                content.classList.remove('active');
            });
            document.getElementById(`${targetTab}TabContent`)?.classList.add('active');
            
            // Load skins if switching to skins tab and not loaded yet
            if (targetTab === 'skins' && !skinsLoaded && weapon) {
                loadWeaponSkins();
            }
        });
    });
}

// ===== WEAPON SKINS =====

// Shared skins cache to avoid duplicate fetch
let allSkinsCache = null;

// Fetch all skins (cached)
async function fetchAllSkins() {
    if (allSkinsCache) return allSkinsCache;
    const SKINS_API = 'https://weaponskins.marathondb.gg';
    let page = 1, collected = [], totalPages = 1;
    do {
        const res = await fetch(`${SKINS_API}/api/skins?page=${page}&per_page=100`);
        if (!res.ok) throw new Error(`Skins API error ${res.status}`);
        const body = await res.json();
        if (!body.success) throw new Error('Skins API returned success=false');
        collected = collected.concat(body.data || []);
        totalPages = body.total_pages || 1;
        page++;
    } while (page <= totalPages);
    allSkinsCache = collected;
    return collected;
}

// Preload just the skins count for the tab badge without full rendering
async function preloadSkinsCount() {
    if (!weapon) return;

    try {
        const collected = await fetchAllSkins();
        const count = collected.filter(skin => skin.weapon?.slug === weapon.slug).length;
        const countBadge = document.getElementById('skinsCount');
        if (countBadge && count > 0) {
            countBadge.textContent = count;
            countBadge.style.display = 'inline-flex';
        }
    } catch (e) {
        console.warn('Could not preload skins count:', e);
    }
}

async function loadWeaponSkins() {
    const container = document.getElementById('skinsContainer');
    if (!container || !weapon) return;

    try {
        const collected = await fetchAllSkins();

        // Normalise new API response and filter for this weapon
        weaponSkins = collected
            .map(skin => ({
                ...skin,
                // Image paths - new API uses image.card / image.thumbnail (full URLs)
                icon_path: skin.image?.card || null,
                icon_path_low: skin.image?.thumbnail || null,
                // Weapon info from nested object
                weapon_slug: skin.weapon?.slug || null,
                weapon_name: skin.weapon?.name || null,
                weapon_category: skin.weapon?.category || null,
                // Collection info from nested object
                collection_slug: skin.collection?.slug || null,
                collection_name: skin.collection?.name || null,
                // Normalise is_limited
                is_limited: skin.is_limited ? 1 : 0
            }))
            .filter(skin => skin.weapon_slug === weapon.slug);

        skinsLoaded = true;

        // Update skins count badge
        const countBadge = document.getElementById('skinsCount');
        if (countBadge && weaponSkins.length > 0) {
            countBadge.textContent = weaponSkins.length;
            countBadge.style.display = 'inline-flex';
        }

        renderWeaponSkins();
    } catch (error) {
        console.error('Failed to load weapon skins:', error);
        container.innerHTML = '<div class="skins-empty"><p>Failed to load skins</p></div>';
    }
}

function renderWeaponSkins() {
    const container = document.getElementById('skinsContainer');
    if (!container) return;
    
    if (weaponSkins.length === 0) {
        container.innerHTML = `
            <div class="skins-empty">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
                </svg>
                <p>No skins available for this weapon yet</p>
                <span class="skins-empty-hint">Check back as more cosmetics are added to the database</span>
            </div>
        `;
        return;
    }
    
    container.innerHTML = `
        <div class="skins-header">
            <h3 class="skins-title">Available Skins</h3>
            <span class="skins-subtitle">${weaponSkins.length} skin${weaponSkins.length !== 1 ? 's' : ''} found</span>
        </div>
        <div class="cosmetics-grid">
            ${weaponSkins.map(skin => renderSkinCard(skin)).join('')}
        </div>
        <div class="skins-view-more">
            <a href="/weapon-skins/" class="view-more-btn">
                <span>View All Weapon Skins</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
            </a>
            <p class="view-more-hint">Explore detailed info, galleries, and acquisition guides</p>
        </div>
    `;
}

function renderSkinCard(skin) {
    const SKINS_API = 'https://weaponskins.marathondb.gg';
    const iconPath = skin.icon_path || skin.icon_path_low || '';
    const buildUrl = (path) => {
        if (!path) return '';
        if (path.startsWith('http')) return path;
        return `${SKINS_API}${path.startsWith('/') ? '' : '/'}${path}`;
    };
    const imageUrl = buildUrl(iconPath) || `${SKINS_API}/assets/weapon-skins/${skin.slug}/card.webp`;
    const lowResUrl = buildUrl(skin.icon_path_low || iconPath) || imageUrl;
    
    const rarityClass = skin.rarity?.toLowerCase() || 'common';
    
    return `
        <a href="/weapon-skins/${skin.slug}/" class="cw-skin-card sticker-card-simple" data-rarity="${rarityClass}">
            <div class="cw-skin-image">
                ${imageUrl ? `
                    <img src="${lowResUrl}" 
                         data-full="${imageUrl}"
                         alt="${escapeHtml(skin.name)}" 
                         loading="lazy"
                         onload="if(this.dataset.full)this.src=this.dataset.full">
                ` : `
                    <div class="cw-skin-placeholder">
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
                            <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/>
                        </svg>
                    </div>
                `}
            </div>
            <div class="cw-skin-info">
                <span class="sticker-name-pill">${escapeHtml(skin.name)}</span>
            </div>
        </a>
    `;
}

function getSourceClass(source) {
    if (!source) return 'source-unknown';
    const s = source.toLowerCase();
    if (s.includes('pre_order') || s.includes('preorder')) return 'source-preorder';
    if (s.includes('deluxe')) return 'source-deluxe';
    if (s.includes('battle_pass') || s.includes('battlepass')) return 'source-battlepass';
    if (s.includes('store') || s.includes('purchase')) return 'source-store';
    if (s.includes('event')) return 'source-event';
    if (s.includes('twitch') || s.includes('drop')) return 'source-twitch';
    return 'source-default';
}

function formatSource(source) {
    if (!source) return 'Unknown';
    const map = {
        'pre_order': 'Pre-Order',
        'preorder': 'Pre-Order',
        'deluxe_edition': 'Deluxe Edition',
        'battle_pass': 'Battle Pass',
        'store': 'Store',
        'event': 'Event',
        'twitch_drop': 'Twitch Drop',
        'twitch': 'Twitch Drop'
    };
    return map[source.toLowerCase()] || source.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

function getSourceIcon(source) {
    if (!source) return '';
    const s = source.toLowerCase();
    
    if (s.includes('pre_order') || s.includes('preorder')) {
        return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M2 12h20"/></svg>';
    }
    if (s.includes('deluxe')) {
        return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>';
    }
    if (s.includes('battle_pass')) {
        return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/></svg>';
    }
    if (s.includes('store')) {
        return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>';
    }
    if (s.includes('twitch')) {
        return '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z"/></svg>';
    }
    return '';
}

// Update meta tags for SEO
function updateMetaTags() {
    const weaponCategory = weapon.category_name || weapon.category || 'Weapon';
    const weaponName = weapon.name;
    
    // SEO-optimized title: "WSTR Combat Shotgun - Marathon Shotgun Stats | MarathonDB"
    const title = `${weaponName} - Marathon ${weaponCategory} Stats & Guide | MarathonDB`;
    
    // SEO-optimized description with weapon-specific keywords
    const cleanDesc = weapon.description && !/details coming soon/i.test(weapon.description)
        ? `${weapon.description} `
        : '';
    const categorySingular = weaponCategory.toLowerCase().replace(/s$/, '');
    const description = `${cleanDesc}${weaponName} ${categorySingular} stats, mods, and build guide for Marathon on MarathonDB.`;
    
    // Keywords targeting specific weapon searches
    const keywords = `Marathon ${weaponName}, ${weaponName} Marathon, Marathon ${weaponCategory}, ${weaponName} stats, ${weaponName} guide, Marathon Bungie ${weaponName}, ${weaponName} mods, Marathon weapon ${weaponName}`;
    
    const pageUrl = `${window.location.origin}/marathon/weapons/${weapon.slug}/`;
    const buildMetaUrl = (path) => {
        if (!path) return null;
        if (path.startsWith('http')) return path;
        return `${MarathonAPI.getApiBase()}${path.startsWith('/') ? '' : '/'}${path}`;
    };
    const imageUrl = buildMetaUrl(weapon.icon_url_webp) || buildMetaUrl(weapon.icon_url_high) || buildMetaUrl(weapon.icon_path_high)
        || MarathonAPI.getWeaponIconUrlBySlug(weapon.slug, 'high');
    
    document.title = title;
    
    // Update meta tags
    updateMetaTag('description', description);
    updateMetaTag('keywords', keywords);
    updateMetaTag('og:title', `${weaponName} - Marathon ${weaponCategory} | MarathonDB`);
    updateMetaTag('og:description', `Complete stats and guide for ${weaponName} in Bungie's Marathon. Damage, accuracy, mods, and loadout tips.`);
    updateMetaTag('og:url', pageUrl);
    updateMetaTag('og:image', imageUrl);
    updateMetaTag('og:site_name', 'MARATHON DB');
    updateMetaTag('twitter:title', `${weaponName} Stats - Marathon ${weaponCategory}`);
    updateMetaTag('twitter:description', `${weaponName} weapon stats, mods, and build guide for Marathon by Bungie.`);
    updateMetaTag('twitter:image', imageUrl);
    
    // Update canonical URL
    const canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) {
        canonical.href = pageUrl;
    }
}

// Update or create meta tag
function updateMetaTag(name, content) {
    let meta = document.querySelector(`meta[name="${name}"], meta[property="${name}"]`);
    if (meta) {
        meta.setAttribute('content', content);
    }
}

// Update breadcrumb with weapon name
function updateBreadcrumb() {
    const breadcrumbName = document.getElementById('breadcrumbName');
    if (breadcrumbName && weapon) {
        breadcrumbName.textContent = weapon.name;
    }
}

// Add structured data for SEO (schema.org JSON-LD)
function addStructuredData() {
    if (!weapon) return;
    
    const buildStructuredUrl = (path) => {
        if (!path) return null;
        if (path.startsWith('http')) return path;
        return `${MarathonAPI.getApiBase()}${path.startsWith('/') ? '' : '/'}${path}`;
    };
    const imageUrl = buildStructuredUrl(weapon.icon_url_webp) || buildStructuredUrl(weapon.icon_url_high) || buildStructuredUrl(weapon.icon_url)
        || buildStructuredUrl(weapon.icon_path_high)
        || MarathonAPI.getWeaponIconUrlBySlug(weapon.slug, 'high');
    
    const weaponCategory = weapon.category_name || weapon.category || 'Weapon';
    const pageUrl = `${window.location.origin}/marathon/weapons/${weapon.slug}/`;
    const siteRoot = `${window.location.origin}/marathon/`;
    const weaponsIndex = `${window.location.origin}/marathon/weapons/`;
    
    // Main product structured data
    const structuredData = {
        "@context": "https://schema.org",
        "@type": "Product",
        "name": `${weapon.name} - Marathon ${weaponCategory}`,
        "description": weapon.description || `${weapon.name} is a ${weaponCategory.toLowerCase()} weapon in Bungie's Marathon extraction shooter. View full stats, damage values, mods, and build guides.`,
        "image": imageUrl,
        "url": pageUrl,
        "brand": {
            "@type": "Brand",
            "name": "Marathon by Bungie"
        },
        "category": weaponCategory,
        "manufacturer": {
            "@type": "Organization",
            "name": "Bungie"
        },
        "isRelatedTo": {
            "@type": "VideoGame",
            "name": "Marathon",
            "gamePlatform": ["PC", "PlayStation 5", "Xbox Series X|S"],
            "author": {
                "@type": "Organization",
                "name": "Bungie"
            }
        }
    };
    
    // Add rating data if available
    if (weapon.average_rating && weapon.rating_count) {
        structuredData.aggregateRating = {
            "@type": "AggregateRating",
            "ratingValue": weapon.average_rating,
            "bestRating": "5",
            "worstRating": "1",
            "ratingCount": weapon.rating_count
        };
    }
    
    // Add weapon stats as additional properties
    const stats = weapon.stats || {};
    const additionalProperties = [];
    
    if (stats.rate_of_fire) {
        additionalProperties.push({
            "@type": "PropertyValue",
            "name": "Rate of Fire",
            "value": stats.rate_of_fire
        });
    }
    if (stats.damage) {
        additionalProperties.push({
            "@type": "PropertyValue",
            "name": "Damage",
            "value": stats.damage
        });
    }
    if (stats.accuracy_score) {
        additionalProperties.push({
            "@type": "PropertyValue",
            "name": "Accuracy",
            "value": stats.accuracy_score
        });
    }
    if (weapon.ammo_type) {
        additionalProperties.push({
            "@type": "PropertyValue",
            "name": "Ammo Type",
            "value": weapon.ammo_type
        });
    }
    if (stats.season_name) {
        additionalProperties.push({
            "@type": "PropertyValue",
            "name": "Season",
            "value": stats.season_name
        });
    }
    
    if (additionalProperties.length > 0) {
        structuredData.additionalProperty = additionalProperties;
    }
    
    // BreadcrumbList for navigation context
    const breadcrumbData = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            {
                "@type": "ListItem",
                "position": 1,
                "name": "Home",
                "item": siteRoot
            },
            {
                "@type": "ListItem",
                "position": 2,
                "name": "Weapons",
                "item": weaponsIndex
            },
            {
                "@type": "ListItem",
                "position": 3,
                "name": weapon.name,
                "item": pageUrl
            }
        ]
    };
    
    // Inject or update the script tags
    let script = document.getElementById('structured-data');
    if (!script) {
        script = document.createElement('script');
        script.id = 'structured-data';
        script.type = 'application/ld+json';
        document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(structuredData);
    
    // Add breadcrumb structured data
    let breadcrumbScript = document.getElementById('breadcrumb-data');
    if (!breadcrumbScript) {
        breadcrumbScript = document.createElement('script');
        breadcrumbScript.id = 'breadcrumb-data';
        breadcrumbScript.type = 'application/ld+json';
        document.head.appendChild(breadcrumbScript);
    }
    breadcrumbScript.textContent = JSON.stringify(breadcrumbData);
}

// ═══════════════════════════════════════
//  STAT HISTORY CHART
// ═══════════════════════════════════════

function renderStatHistoryChart() {
    const container = document.getElementById('statHistoryChart');
    if (!container || !weaponHistory || weaponHistory.length < 2) {
        if (container) container.style.display = 'none';
        return;
    }

    // Show the container
    container.style.display = 'block';

    const chartStats = [
        { key: 'firepower_score', label: 'Firepower', color: '#ef4444' },
        { key: 'handling_score', label: 'Handling', color: '#f97316' },
        { key: 'rate_of_fire', label: 'Fire Rate', color: '#f59e0b' },
        { key: 'accuracy_score', label: 'Accuracy', color: '#22c55e' },
        { key: 'range_meters', label: 'Range', color: '#3b82f6' },
        { key: 'magazine_size', label: 'Magazine', color: '#a855f7' },
        { key: 'reload_speed', label: 'Reload', color: '#06b6d4' },
    ];

    // Only show charts for stats that have varying values across seasons
    const chartsToRender = chartStats.filter(stat => {
        const vals = weaponHistory.map(s => s[stat.key]).filter(v => v !== null && v !== undefined);
        if (vals.length < 2) return false;
        return new Set(vals.map(Number)).size > 1; // Only if values actually changed
    });

    if (chartsToRender.length === 0) {
        container.style.display = 'none';
        return;
    }

    const seasons = weaponHistory.map(s => s.season_name || s.season_version || `S${s.season_id}`);

    container.innerHTML = `
        <h3 class="stats-group-title">Stat Changes Over Time</h3>
        <div class="stat-charts-grid">
            ${chartsToRender.map(stat => {
                const vals = weaponHistory.map(s => {
                    const v = s[stat.key];
                    return v !== null && v !== undefined ? Number(v) : null;
                });
                return renderMiniChart(stat, vals, seasons);
            }).join('')}
        </div>
    `;
}

function renderMiniChart(stat, values, seasons) {
    const validVals = values.filter(v => v !== null);
    if (validVals.length < 2) return '';

    const minVal = Math.min(...validVals);
    const maxVal = Math.max(...validVals);
    const range = maxVal - minVal || 1;

    const W = 200;
    const H = 60;
    const padX = 4;
    const padY = 6;
    const chartW = W - padX * 2;
    const chartH = H - padY * 2;

    // Build points
    const points = [];
    const dots = [];
    values.forEach((v, i) => {
        if (v === null) return;
        const x = padX + (i / (values.length - 1)) * chartW;
        const y = padY + chartH - ((v - minVal) / range) * chartH;
        points.push(`${x},${y}`);
        dots.push({ x, y, val: v, season: seasons[i] });
    });

    const polyline = points.join(' ');

    // First and last values
    const first = validVals[0];
    const last = validVals[validVals.length - 1];
    const diff = last - first;
    const diffStr = diff > 0 ? `+${diff}` : `${diff}`;
    const diffClass = diff > 0 ? 'chart-up' : diff < 0 ? 'chart-down' : 'chart-neutral';

    return `<div class="stat-mini-chart">
        <div class="chart-header">
            <span class="chart-label" style="color: ${stat.color}">${stat.label}</span>
            <span class="chart-diff ${diffClass}">${diffStr}</span>
        </div>
        <svg viewBox="0 0 ${W} ${H}" class="chart-svg" preserveAspectRatio="none">
            <polyline points="${polyline}" fill="none" stroke="${stat.color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/>
            ${dots.map(d => `<circle cx="${d.x}" cy="${d.y}" r="3" fill="${stat.color}" stroke="var(--bg-card)" stroke-width="1.5"><title>${d.season}: ${d.val}</title></circle>`).join('')}
        </svg>
        <div class="chart-range">
            <span>${minVal}</span>
            <span>${maxVal}</span>
        </div>
    </div>`;
}

// ═══════════════════════════════════════
// COMMUNITY RATING TIMELINE CHART
// ═══════════════════════════════════════

async function renderRatingTimeline() {
    const container = document.getElementById('ratingTimelineChart');
    if (!container || !weapon?.slug) return;

    if (typeof RatingsAPI === 'undefined' || typeof RatingsAPI.getWeaponTimeline !== 'function') {
        return;
    }

    try {
        const res = await RatingsAPI.getWeaponTimeline(weapon.slug, { days: 365, granularity: 'day' });

        if (!res.success || !res.timeline || res.timeline.length < 2) {
            container.style.display = 'none';
            return;
        }

        const timeline = res.timeline;
        container.style.display = 'block';

        // Format dates for labels — adapt format to data range
        const dateFormat = timeline.length > 60
            ? { month: 'short', year: '2-digit' }
            : { month: 'short', day: 'numeric' };
        const labels = timeline.map(p => {
            const d = new Date(p.period + 'T00:00:00');
            return d.toLocaleDateString('en-US', dateFormat);
        });
        const ratings = timeline.map(p => p.average_rating);
        const votes = timeline.map(p => p.total_votes);

        container.innerHTML = `
            <h3 class="stats-group-title">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                </svg>
                Community Rating Over Time
            </h3>
            <div class="rating-timeline-canvas-wrap">
                <canvas id="ratingTimelineCanvas"></canvas>
            </div>
        `;

        // Wait for Chart.js to be available (loaded via defer)
        if (typeof Chart === 'undefined') {
            container.style.display = 'none';
            return;
        }

        const canvas = document.getElementById('ratingTimelineCanvas');
        const ctx = canvas.getContext('2d');

        const neonColor = getComputedStyle(document.documentElement).getPropertyValue('--neon').trim() || '#d4ff00';

        new Chart(ctx, {
            type: 'line',
            data: {
                labels,
                datasets: [{
                    label: 'Avg Rating',
                    data: ratings,
                    borderColor: neonColor,
                    backgroundColor: neonColor + '1a',
                    fill: true,
                    tension: 0.35,
                    pointRadius: timeline.length > 60 ? 1 : 3,
                    pointHoverRadius: 5,
                    pointBackgroundColor: neonColor,
                    pointBorderColor: 'rgba(0,0,0,0.5)',
                    pointBorderWidth: 1,
                    borderWidth: 2,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: 'rgba(20, 20, 30, 0.95)',
                        titleColor: '#fff',
                        bodyColor: '#ccc',
                        borderColor: neonColor + '40',
                        borderWidth: 1,
                        padding: 10,
                        callbacks: {
                            label: function(ctx) {
                                const idx = ctx.dataIndex;
                                return `Rating: ${ratings[idx].toFixed(2)}★  (${votes[idx]} vote${votes[idx] !== 1 ? 's' : ''})`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        min: 1,
                        max: 5,
                        ticks: {
                            stepSize: 1,
                            color: 'rgba(255,255,255,0.5)',
                            font: { size: 11 },
                            callback: v => v + '★'
                        },
                        grid: {
                            color: 'rgba(255,255,255,0.06)',
                        }
                    },
                    x: {
                        ticks: {
                            color: 'rgba(255,255,255,0.4)',
                            font: { size: 10 },
                            maxRotation: 45,
                            autoSkip: true,
                            maxTicksLimit: 15,
                        },
                        grid: { display: false }
                    }
                }
            }
        });
    } catch (err) {
        console.warn('Failed to render rating timeline:', err);
        container.style.display = 'none';
    }
}
