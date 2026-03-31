// Runner Compare Module
// Handles runner comparison on both detail pages and listing page

const RunnerCompare = (function() {
    const RUNNER_API = 'https://runners.marathondb.gg/api/runners';
    const ASSET_BASE = 'https://helpbot.marathondb.gg/assets/runners';

    const RUNNERS = [
        { slug: 'assassin', name: 'Assassin', role: 'Shadow assassin' },
        { slug: 'destroyer', name: 'Destroyer', role: 'Combat specialist' },
        { slug: 'recon', name: 'Recon', role: 'Tactical strategist' },
        { slug: 'rook', name: 'Rook', role: 'Opportunist' },
        { slug: 'thief', name: 'Thief', role: 'Covert acquisitions' },
        { slug: 'triage', name: 'Triage', role: 'Field medic' },
        { slug: 'vandal', name: 'Vandal', role: 'Combat anarchist' }
    ];

    const STAT_CONFIG = [
        { key: 'heat_capacity', label: 'Heat Capacity' },
        { key: 'agility', label: 'Agility' },
        { key: 'loot_speed', label: 'Loot Speed' },
        { key: 'melee_damage', label: 'Melee Damage' },
        { key: 'prime_recovery', label: 'Prime Recovery' },
        { key: 'tactical_recovery', label: 'Tactical Recovery' },
        { key: 'self_repair_speed', label: 'Self Repair' },
        { key: 'finisher_siphon', label: 'Finisher Siphon' },
        { key: 'revive_speed', label: 'Revive Speed' },
        { key: 'hardware', label: 'Hardware' },
        { key: 'firewall', label: 'Firewall' },
        { key: 'fall_resistance', label: 'Fall Resistance' },
        { key: 'ping_duration', label: 'Ping Duration' }
    ];

    const ABILITY_ORDER = ['tech', 'prime', 'tactical', 'trait_1', 'trait_2'];

    const cache = {};

    // ── Helpers ──

    function esc(str) {
        const d = document.createElement('div');
        d.textContent = str || '';
        return d.innerHTML;
    }

    function getImage(slug, size) {
        size = size || '150x230';
        return ASSET_BASE + '/' + slug + '-' + size + '.png';
    }

    function getLatestStats(runner) {
        if (Array.isArray(runner.stats) && runner.stats.length > 0) {
            return runner.stats[runner.stats.length - 1];
        }
        return runner.stats || {};
    }

    function formatAbilityType(type) {
        var types = { tech:'TECH', prime:'PRIME', tactical:'TACTICAL', trait_1:'TRAIT', trait_2:'TRAIT', passive:'PASSIVE' };
        return types[type] || (type ? type.toUpperCase() : 'ABILITY');
    }

    function getTypeKey(type) {
        var t = (type || '').toLowerCase();
        if (t === 'tech') return 'tech';
        if (t === 'prime') return 'prime';
        if (t === 'tactical') return 'tactical';
        if (t.indexOf('trait') === 0) return 'trait';
        if (t === 'passive') return 'passive';
        return 'other';
    }

    // ── API ──

    async function fetchRunner(slug) {
        if (cache[slug]) return cache[slug];
        try {
            var res = await fetch(RUNNER_API + '/' + slug);
            var json = await res.json();
            if (json && json.success && json.data) {
                cache[slug] = json.data;
                cache[slug].slug = slug;
                return cache[slug];
            }
        } catch (e) {
            console.error('Failed to fetch runner:', slug, e);
        }
        return null;
    }

    // ── Rendering ──

    function renderStatBars(r1, r2) {
        var s1 = getLatestStats(r1);
        var s2 = getLatestStats(r2);

        return STAT_CONFIG.map(function(stat) {
            var v1 = s1[stat.key] != null ? s1[stat.key] : null;
            var v2 = s2[stat.key] != null ? s2[stat.key] : null;
            if (v1 === null && v2 === null) return '';
            v1 = v1 || 0;
            v2 = v2 || 0;

            var c1 = v1 > v2 ? 'compare-win' : v1 < v2 ? 'compare-lose' : '';
            var c2 = v2 > v1 ? 'compare-win' : v2 < v1 ? 'compare-lose' : '';

            return '<div class="compare-stat-row">' +
                '<div class="compare-stat-val compare-stat-val--left ' + c1 + '">' + v1 + '</div>' +
                '<div class="compare-stat-center">' +
                    '<div class="compare-stat-bars">' +
                        '<div class="compare-bar compare-bar--left"><div class="compare-bar-fill compare-bar-fill--left ' + c1 + '" style="width:' + v1 + '%"></div></div>' +
                        '<div class="compare-bar compare-bar--right"><div class="compare-bar-fill compare-bar-fill--right ' + c2 + '" style="width:' + v2 + '%"></div></div>' +
                    '</div>' +
                    '<div class="compare-stat-label">' + stat.label + '</div>' +
                '</div>' +
                '<div class="compare-stat-val compare-stat-val--right ' + c2 + '">' + v2 + '</div>' +
            '</div>';
        }).join('');
    }

    function renderAbilitySide(runner) {
        var abilities = runner.abilities || [];
        var sorted = ABILITY_ORDER.map(function(t) { return abilities.find(function(a) { return a.ability_type === t; }); }).filter(Boolean);
        abilities.forEach(function(a) { if (sorted.indexOf(a) === -1) sorted.push(a); });

        return sorted.map(function(ab) {
            var typeKey = getTypeKey(ab.ability_type);
            var pills = [];
            var cd = ab.cooldown_seconds != null ? ab.cooldown_seconds : ab.cooldown;
            if (cd != null) pills.push('<span class="compare-pill">' + cd + 's CD</span>');
            if (ab.duration != null) pills.push('<span class="compare-pill">' + ab.duration + 's</span>');
            if (ab.charges != null) pills.push('<span class="compare-pill">' + ab.charges + ' charge' + (ab.charges !== 1 ? 's' : '') + '</span>');

            return '<div class="compare-ability compare-ability--' + typeKey + '">' +
                '<div class="compare-ability-type">' + formatAbilityType(ab.ability_type) + '</div>' +
                '<div class="compare-ability-name">' + esc(ab.name) + '</div>' +
                (ab.description ? '<div class="compare-ability-desc">' + esc(ab.description) + '</div>' : '') +
                (pills.length ? '<div class="compare-ability-pills">' + pills.join('') + '</div>' : '') +
            '</div>';
        }).join('');
    }

    function renderComparison(r1, r2, container) {
        var html = '<div class="compare-panel">' +
            '<div class="compare-panel-header">' +
                '<button class="compare-panel-close" id="compareClose" title="Close comparison">' +
                    '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>' +
                '</button>' +
                '<h2 class="compare-panel-title">Runner Comparison</h2>' +
            '</div>' +

            // Runner headers
            '<div class="compare-runners-header">' +
                '<div class="compare-runner-col compare-runner-col--left">' +
                    '<img src="' + getImage(r1.slug) + '" alt="' + esc(r1.name) + '" class="compare-portrait" onerror="this.style.display=\'none\'">' +
                    '<div class="compare-runner-name">' + esc(r1.name) + '</div>' +
                    '<div class="compare-runner-role">' + esc(r1.description || r1.role || '') + '</div>' +
                '</div>' +
                '<div class="compare-vs">VS</div>' +
                '<div class="compare-runner-col compare-runner-col--right">' +
                    '<img src="' + getImage(r2.slug) + '" alt="' + esc(r2.name) + '" class="compare-portrait" onerror="this.style.display=\'none\'">' +
                    '<div class="compare-runner-name">' + esc(r2.name) + '</div>' +
                    '<div class="compare-runner-role">' + esc(r2.description || r2.role || '') + '</div>' +
                '</div>' +
            '</div>' +

            // Stats section
            '<div class="compare-section">' +
                '<div class="compare-section-title">Stats</div>' +
                '<div class="compare-stats">' + renderStatBars(r1, r2) + '</div>' +
            '</div>' +

            // Abilities section
            '<div class="compare-section">' +
                '<div class="compare-section-title">Abilities</div>' +
                '<div class="compare-abilities">' +
                    '<div class="compare-abilities-col">' + renderAbilitySide(r1) + '</div>' +
                    '<div class="compare-abilities-col">' + renderAbilitySide(r2) + '</div>' +
                '</div>' +
            '</div>' +
        '</div>';

        container.innerHTML = html;
        container.style.display = 'block';

        // Close button
        document.getElementById('compareClose').addEventListener('click', function() {
            container.style.display = 'none';
            container.innerHTML = '';
        });
    }

    // ── Runner Picker (dropdown) ──

    function renderPicker(excludeSlug, onSelect, anchorEl) {
        // Remove existing picker if any
        var existing = document.querySelector('.compare-picker');
        if (existing) existing.remove();

        var available = RUNNERS.filter(function(r) { return r.slug !== excludeSlug; });

        var picker = document.createElement('div');
        picker.className = 'compare-picker';
        picker.innerHTML = '<div class="compare-picker-header">Select a runner to compare</div>' +
            '<div class="compare-picker-grid">' +
            available.map(function(r) {
                return '<button class="compare-picker-item" data-slug="' + r.slug + '">' +
                    '<img src="' + getImage(r.slug) + '" alt="' + esc(r.name) + '" class="compare-picker-img" onerror="this.style.display=\'none\'">' +
                    '<span class="compare-picker-name">' + esc(r.name) + '</span>' +
                '</button>';
            }).join('') +
            '</div>';

        // Position near anchor
        if (anchorEl) {
            anchorEl.parentNode.style.position = 'relative';
            anchorEl.parentNode.appendChild(picker);
        } else {
            document.body.appendChild(picker);
        }

        // Handle clicks
        picker.querySelectorAll('.compare-picker-item').forEach(function(btn) {
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

    // ── Detail Page: Compare Button Handler ──

    function initDetailPage(currentSlug) {
        var btn = document.getElementById('compareRunnerBtn');
        if (!btn) return;

        var container = document.getElementById('compareContainer');

        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            renderPicker(currentSlug, async function(slug) {
                btn.classList.add('loading');
                btn.disabled = true;

                var current = await fetchRunner(currentSlug);
                var other = await fetchRunner(slug);

                btn.classList.remove('loading');
                btn.disabled = false;

                if (current && other && container) {
                    renderComparison(current, other, container);
                    container.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }, btn);
        });
    }

    // ── Listing Page: Full Compare Tool ──

    function initListingPage() {
        var section = document.getElementById('compareSection');
        if (!section) return;

        var slot1 = null;
        var slot2 = null;
        var slotEl1 = section.querySelector('.compare-slot[data-slot="1"]');
        var slotEl2 = section.querySelector('.compare-slot[data-slot="2"]');
        var resultsEl = document.getElementById('compareResults');
        var compareBtn = document.getElementById('compareGoBtn');
        var resetBtn = document.getElementById('compareResetBtn');

        function updateSlotUI(slotEl, runner) {
            if (runner) {
                slotEl.innerHTML = '<img src="' + getImage(runner.slug) + '" alt="' + esc(runner.name) + '" class="compare-slot-img" onerror="this.style.display=\'none\'">' +
                    '<div class="compare-slot-info">' +
                        '<div class="compare-slot-name">' + esc(runner.name) + '</div>' +
                        '<div class="compare-slot-role">' + esc(runner.role) + '</div>' +
                    '</div>' +
                    '<div class="compare-slot-change">Change</div>';
                slotEl.classList.add('compare-slot--filled');
            } else {
                slotEl.innerHTML = '<div class="compare-slot-empty">' +
                    '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="8" r="4"/><path d="M5 20v-1a7 7 0 0 1 14 0v1"/></svg>' +
                    '<span>Select Runner</span>' +
                '</div>';
                slotEl.classList.remove('compare-slot--filled');
            }
        }

        function getExcludeSlugs() {
            var exclude = [];
            if (slot1) exclude.push(slot1.slug);
            if (slot2) exclude.push(slot2.slug);
            return exclude;
        }

        function updateButtons() {
            if (slot1 && slot2) {
                compareBtn.disabled = false;
                compareBtn.classList.add('compare-go--ready');
            } else {
                compareBtn.disabled = true;
                compareBtn.classList.remove('compare-go--ready');
            }
        }

        function openSlotPicker(slotNum) {
            var exclude = slotNum === 1 && slot2 ? slot2.slug : slotNum === 2 && slot1 ? slot1.slug : null;
            var anchor = slotNum === 1 ? slotEl1 : slotEl2;

            // Build inline picker for listing page - full overlay
            var overlay = document.createElement('div');
            overlay.className = 'compare-listing-picker-overlay';

            var available = RUNNERS.filter(function(r) { return r.slug !== exclude; });
            overlay.innerHTML = '<div class="compare-listing-picker">' +
                '<div class="compare-listing-picker-header">' +
                    '<span>Choose Runner ' + slotNum + '</span>' +
                    '<button class="compare-listing-picker-close">' +
                        '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>' +
                    '</button>' +
                '</div>' +
                '<div class="compare-listing-picker-grid">' +
                available.map(function(r) {
                    return '<button class="compare-listing-picker-item" data-slug="' + r.slug + '">' +
                        '<img src="' + getImage(r.slug) + '" alt="' + esc(r.name) + '" onerror="this.style.display=\'none\'" loading="lazy">' +
                        '<div class="compare-listing-picker-name">' + esc(r.name) + '</div>' +
                        '<div class="compare-listing-picker-role">' + esc(r.role) + '</div>' +
                    '</button>';
                }).join('') +
                '</div>' +
            '</div>';

            document.body.appendChild(overlay);

            overlay.querySelector('.compare-listing-picker-close').addEventListener('click', function() {
                overlay.remove();
            });

            overlay.addEventListener('click', function(e) {
                if (e.target === overlay) overlay.remove();
            });

            overlay.querySelectorAll('.compare-listing-picker-item').forEach(function(btn) {
                btn.addEventListener('click', function() {
                    var r = RUNNERS.find(function(x) { return x.slug === btn.dataset.slug; });
                    if (r) {
                        if (slotNum === 1) { slot1 = r; updateSlotUI(slotEl1, r); }
                        else { slot2 = r; updateSlotUI(slotEl2, r); }
                        updateButtons();
                    }
                    overlay.remove();
                });
            });
        }

        // Slot click handlers
        slotEl1.addEventListener('click', function() { openSlotPicker(1); });
        slotEl2.addEventListener('click', function() { openSlotPicker(2); });

        // Compare button
        compareBtn.addEventListener('click', async function() {
            if (!slot1 || !slot2) return;
            compareBtn.disabled = true;
            compareBtn.textContent = 'Loading...';

            var r1 = await fetchRunner(slot1.slug);
            var r2 = await fetchRunner(slot2.slug);

            compareBtn.textContent = 'Compare';
            compareBtn.disabled = false;

            if (r1 && r2) {
                renderComparison(r1, r2, resultsEl);
                resultsEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });

        // Reset button
        resetBtn.addEventListener('click', function() {
            slot1 = null;
            slot2 = null;
            updateSlotUI(slotEl1, null);
            updateSlotUI(slotEl2, null);
            updateButtons();
            resultsEl.style.display = 'none';
            resultsEl.innerHTML = '';
        });

        // Initialize
        updateSlotUI(slotEl1, null);
        updateSlotUI(slotEl2, null);
        updateButtons();
    }

    // ── Public API ──

    return {
        RUNNERS: RUNNERS,
        fetchRunner: fetchRunner,
        getImage: getImage,
        initDetailPage: initDetailPage,
        initListingPage: initListingPage
    };
})();

// Auto-init on DOMContentLoaded
document.addEventListener('DOMContentLoaded', function() {
    // Detail page?
    var compareBtn = document.getElementById('compareRunnerBtn');
    if (compareBtn) {
        var slug = window.location.pathname.split('/').filter(Boolean).pop();
        RunnerCompare.initDetailPage(slug);
    }

    // Listing page?
    var compareSection = document.getElementById('compareSection');
    if (compareSection) {
        RunnerCompare.initListingPage();
    }
});
