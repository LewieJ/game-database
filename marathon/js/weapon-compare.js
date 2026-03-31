// Weapon Compare Module
// Handles weapon comparison on detail pages

const WeaponCompare = (function() {
    const API_BASE = 'https://weapons.marathondb.gg/api/weapons';
    const ICON_BASE = 'https://helpbot.marathondb.gg/assets/weapons';

    const WEAPONS = [
        { slug: 'impact-har', name: 'Impact HAR', category: 'Assault Rifles' },
        { slug: 'm77-assault-rifle', name: 'M77 Assault Rifle', category: 'Assault Rifles' },
        { slug: 'overrun-ar', name: 'Overrun AR', category: 'Assault Rifles' },
        { slug: 'v75-scar', name: 'V75 Scar', category: 'Assault Rifles' },
        { slug: 'conquest-lmg', name: 'Conquest LMG', category: 'Machine Guns' },
        { slug: 'demolition-hmg', name: 'Demolition HMG', category: 'Machine Guns' },
        { slug: 'retaliator-lmg', name: 'Retaliator LMG', category: 'Machine Guns' },
        { slug: 'melee', name: 'Melee', category: 'Melee' },
        { slug: 'ce-tactical-sidearm', name: 'CE Tactical Sidearm', category: 'Pistols' },
        { slug: 'magnum-mc', name: 'Magnum MC', category: 'Pistols' },
        { slug: 'v11-punch', name: 'V11 Punch', category: 'Pistols' },
        { slug: 'b33-volley-rifle', name: 'BR33 Volley Rifle', category: 'Precision Rifles' },
        { slug: 'hardline-pr', name: 'Hardline PR', category: 'Precision Rifles' },
        { slug: 'repeater-hpr', name: 'Repeater HPR', category: 'Precision Rifles' },
        { slug: 'stryder-m1t', name: 'Stryder M1T', category: 'Precision Rifles' },
        { slug: 'twin-tap-hbr', name: 'Twin Tap HBR', category: 'Precision Rifles' },
        { slug: 'v66-lookout', name: 'V66 Lookout', category: 'Precision Rifles' },
        { slug: 'v95-lookout', name: 'V95 Lookout', category: 'Precision Rifles' },
        { slug: 'ares-rg', name: 'Ares RG', category: 'Railguns' },
        { slug: 'v00-zeus-rg', name: 'V00 Zeus RG', category: 'Railguns' },
        { slug: 'misriah-2442', name: 'Misriah 2442', category: 'Shotguns' },
        { slug: 'v85-circuit-breaker', name: 'V85 Circuit Breaker', category: 'Shotguns' },
        { slug: 'wstr-combat-shotgun', name: 'WSTR Combat Shotgun', category: 'Shotguns' },
        { slug: 'longshot', name: 'Longshot', category: 'Sniper Rifles' },
        { slug: 'outland', name: 'Outland', category: 'Sniper Rifles' },
        { slug: 'v99-channel-rifle', name: 'V99 Channel Rifle', category: 'Sniper Rifles' },
        { slug: 'brrt-smg', name: 'BRRT SMG', category: 'Submachine Guns' },
        { slug: 'bully-smg', name: 'Bully SMG', category: 'Submachine Guns' },
        { slug: 'copperhead-rf', name: 'Copperhead RF', category: 'Submachine Guns' },
        { slug: 'v22-volt-thrower', name: 'V22 Volt Thrower', category: 'Submachine Guns' }
    ];

    // Stats to compare — key, display label, unit suffix, max for bar scaling, higher is better?
    const STAT_CONFIG = [
        { key: 'firepower_score', label: 'Firepower', max: 100, higher: true },
        { key: 'accuracy_score',  label: 'Accuracy',  max: 100, higher: true },
        { key: 'handling_score',  label: 'Handling',   max: 100, higher: true },
        { key: 'range_meters',    label: 'Range',      max: 80,  higher: true, suffix: 'M' },
        { key: 'magazine_size',   label: 'Magazine',   max: 80,  higher: true },
        { key: 'rate_of_fire',    label: 'Rate of Fire', max: 1200, higher: true, suffix: ' RPM' },
        { key: 'reload_speed',    label: 'Reload',     max: 5,   higher: false, suffix: 's' },
        { key: 'recoil',          label: 'Recoil',     max: 100, higher: false },
        { key: 'aim_assist',      label: 'Aim Assist', max: 3,   higher: true, suffix: 'x' },
        { key: 'precision',       label: 'Precision',  max: 3,   higher: true, suffix: 'x' },
        { key: 'zoom',            label: 'Zoom',       max: 10,  higher: true, suffix: 'x' },
        { key: 'damage',          label: 'Damage',     max: 200, higher: true }
    ];

    const cache = {};

    // ── Helpers ──

    function esc(str) {
        const d = document.createElement('div');
        d.textContent = str || '';
        return d.innerHTML;
    }

    function getIcon(slug, size) {
        size = size || '180x135';
        return ICON_BASE + '/' + slug + '-' + size + '.png';
    }

    function getLatestStats(weapon) {
        if (Array.isArray(weapon.stats)) {
            var current = weapon.stats.find(function(s) { return s.is_current; });
            return current || weapon.stats[weapon.stats.length - 1] || {};
        }
        return weapon.stats || {};
    }

    function formatValue(val, stat) {
        if (val == null) return '—';
        var s = stat.suffix || '';
        if (typeof val === 'number') {
            return (Number.isInteger(val) ? val : val.toFixed(2).replace(/\.?0+$/, '')) + s;
        }
        return val + s;
    }

    // ── API ──

    async function fetchWeapon(slug) {
        if (cache[slug]) return cache[slug];
        try {
            var res = await fetch(API_BASE + '/' + encodeURIComponent(slug));
            var json = await res.json();
            if (json && json.data) {
                cache[slug] = json.data;
                cache[slug].slug = slug;
                return cache[slug];
            }
        } catch (e) {
            console.error('Failed to fetch weapon:', slug, e);
        }
        return null;
    }

    // ── Rendering ──

    function renderStatBars(w1, w2) {
        var s1 = getLatestStats(w1);
        var s2 = getLatestStats(w2);

        return STAT_CONFIG.map(function(stat) {
            var v1 = s1[stat.key] != null ? s1[stat.key] : null;
            var v2 = s2[stat.key] != null ? s2[stat.key] : null;
            if (v1 === null && v2 === null) return '';
            v1 = v1 != null ? v1 : 0;
            v2 = v2 != null ? v2 : 0;

            // Determine winner based on whether higher is better
            var winner1, winner2;
            if (stat.higher !== false) {
                winner1 = v1 > v2;
                winner2 = v2 > v1;
            } else {
                winner1 = v1 < v2;
                winner2 = v2 < v1;
            }
            var c1 = winner1 ? 'compare-win' : (winner2 ? 'compare-lose' : '');
            var c2 = winner2 ? 'compare-win' : (winner1 ? 'compare-lose' : '');

            var pct1 = Math.min((v1 / stat.max) * 100, 100);
            var pct2 = Math.min((v2 / stat.max) * 100, 100);

            return '<div class="compare-stat-row">' +
                '<div class="compare-stat-val compare-stat-val--left ' + c1 + '">' + formatValue(v1, stat) + '</div>' +
                '<div class="compare-stat-center">' +
                    '<div class="compare-stat-bars">' +
                        '<div class="compare-bar compare-bar--left"><div class="compare-bar-fill compare-bar-fill--left ' + c1 + '" style="width:' + pct1 + '%"></div></div>' +
                        '<div class="compare-bar compare-bar--right"><div class="compare-bar-fill compare-bar-fill--right ' + c2 + '" style="width:' + pct2 + '%"></div></div>' +
                    '</div>' +
                    '<div class="compare-stat-label">' + stat.label + '</div>' +
                '</div>' +
                '<div class="compare-stat-val compare-stat-val--right ' + c2 + '">' + formatValue(v2, stat) + '</div>' +
            '</div>';
        }).join('');
    }

    function renderComparison(w1, w2, container) {
        var s1 = getLatestStats(w1);
        var s2 = getLatestStats(w2);

        var html = '<div class="compare-panel">' +
            '<div class="compare-panel-header">' +
                '<button class="compare-panel-close" id="weaponCompareClose" title="Close comparison">' +
                    '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>' +
                '</button>' +
                '<h2 class="compare-panel-title">Weapon Comparison</h2>' +
            '</div>' +

            // Weapon headers
            '<div class="compare-runners-header">' +
                '<div class="compare-runner-col compare-runner-col--left">' +
                    '<img src="' + getIcon(w1.slug) + '" alt="' + esc(w1.name) + '" class="compare-weapon-thumb" onerror="this.style.display=\'none\'">' +
                    '<div>' +
                        '<div class="compare-runner-name">' + esc(w1.name) + '</div>' +
                        '<div class="compare-runner-role">' + esc(w1.category_name || '') + '</div>' +
                    '</div>' +
                '</div>' +
                '<div class="compare-vs">VS</div>' +
                '<div class="compare-runner-col compare-runner-col--right">' +
                    '<img src="' + getIcon(w2.slug) + '" alt="' + esc(w2.name) + '" class="compare-weapon-thumb" onerror="this.style.display=\'none\'">' +
                    '<div>' +
                        '<div class="compare-runner-name">' + esc(w2.name) + '</div>' +
                        '<div class="compare-runner-role">' + esc(w2.category_name || '') + '</div>' +
                    '</div>' +
                '</div>' +
            '</div>' +

            // Stats section
            '<div class="compare-section">' +
                '<div class="compare-section-title">Stats</div>' +
                '<div class="compare-stats">' + renderStatBars(w1, w2) + '</div>' +
            '</div>' +

            // Quick info comparison row
            '<div class="compare-section">' +
                '<div class="compare-section-title">Info</div>' +
                '<div class="compare-info-grid">' +
                    renderInfoRow('Ammo', formatAmmo(w1), formatAmmo(w2)) +
                    renderInfoRow('Type', w1.type || '—', w2.type || '—') +
                    renderInfoRow('Value', formatCredits(w1), formatCredits(w2)) +
                '</div>' +
            '</div>' +
        '</div>';

        container.innerHTML = html;
        container.style.display = 'block';

        document.getElementById('weaponCompareClose').addEventListener('click', function() {
            container.style.display = 'none';
            container.innerHTML = '';
        });
    }

    function renderInfoRow(label, val1, val2) {
        return '<div class="compare-info-row">' +
            '<span class="compare-info-val compare-info-val--left">' + val1 + '</span>' +
            '<span class="compare-info-label">' + label + '</span>' +
            '<span class="compare-info-val compare-info-val--right">' + val2 + '</span>' +
        '</div>';
    }

    function formatAmmo(w) {
        if (!w.ammo_type) return '—';
        return w.ammo_type.replace(/_/g, ' ').replace(/\b\w/g, function(l) { return l.toUpperCase(); });
    }

    function formatCredits(w) {
        if (!w.cost_credits) return '—';
        return '<img src="/assets/icons/credits.webp" alt="Credits" class="compare-credits-icon">' + w.cost_credits.toLocaleString();
    }

    // ── Weapon Picker ──

    function renderPicker(excludeSlug, onSelect, anchorEl) {
        var existing = document.querySelector('.compare-picker');
        if (existing) existing.remove();

        var available = WEAPONS.filter(function(w) { return w.slug !== excludeSlug; });

        // Group by category
        var categories = {};
        available.forEach(function(w) {
            if (!categories[w.category]) categories[w.category] = [];
            categories[w.category].push(w);
        });

        var picker = document.createElement('div');
        picker.className = 'compare-picker weapon-compare-picker';

        var innerHtml = '<div class="compare-picker-header">Select a weapon to compare</div>';
        innerHtml += '<div class="weapon-compare-picker-scroll">';

        Object.keys(categories).sort().forEach(function(cat) {
            innerHtml += '<div class="weapon-compare-picker-cat">' + esc(cat) + '</div>';
            innerHtml += '<div class="weapon-compare-picker-grid">';
            categories[cat].forEach(function(w) {
                innerHtml += '<button class="compare-picker-item weapon-compare-picker-item" data-slug="' + w.slug + '">' +
                    '<img src="' + getIcon(w.slug) + '" alt="' + esc(w.name) + '" class="weapon-compare-picker-img" onerror="this.style.display=\'none\'">' +
                    '<span class="compare-picker-name">' + esc(w.name) + '</span>' +
                '</button>';
            });
            innerHtml += '</div>';
        });

        innerHtml += '</div>';
        picker.innerHTML = innerHtml;

        // Position near anchor
        if (anchorEl) {
            anchorEl.parentNode.style.position = 'relative';
            anchorEl.parentNode.appendChild(picker);
        } else {
            document.body.appendChild(picker);
        }

        // Handle clicks
        picker.querySelectorAll('.weapon-compare-picker-item').forEach(function(btn) {
            btn.addEventListener('click', function() {
                picker.remove();
                onSelect(btn.dataset.slug);
            });
        });

        // Close on outside click
        setTimeout(function() {
            function onOutside(e) {
                if (!picker.contains(e.target)) {
                    picker.remove();
                    document.removeEventListener('click', onOutside);
                }
            }
            document.addEventListener('click', onOutside);
        }, 50);
    }

    // ── Detail Page Init ──

    function initDetailPage(currentSlug) {
        var btn = document.getElementById('compareWeaponBtn');
        if (!btn) return;

        var container = document.getElementById('weaponCompareContainer');

        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            renderPicker(currentSlug, async function(slug) {
                btn.classList.add('loading');
                btn.disabled = true;

                var current = await fetchWeapon(currentSlug);
                var other = await fetchWeapon(slug);

                btn.classList.remove('loading');
                btn.disabled = false;

                if (current && other && container) {
                    renderComparison(current, other, container);
                    container.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }, btn);
        });
    }

    // ── Public API ──

    return {
        WEAPONS: WEAPONS,
        fetchWeapon: fetchWeapon,
        initDetailPage: initDetailPage
    };
})();

// Auto-init
document.addEventListener('DOMContentLoaded', function() {
    var compareBtn = document.getElementById('compareWeaponBtn');
    if (compareBtn) {
        var parts = window.location.pathname.split('/').filter(Boolean);
        var slug = parts.length >= 2 && parts[0] === 'weapons' ? parts[1] : null;
        if (slug) WeaponCompare.initDetailPage(slug);
    }
});
