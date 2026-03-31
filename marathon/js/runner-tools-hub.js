// ──────────────────────────────────────────────
//  Runner Tools Hub – Inline Tier List, Squad Builder, Hub Nav
//  Lives on /runners/ page — keeps users engaged without navigation
// ──────────────────────────────────────────────

(function () {
    'use strict';

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

    function getImg(slug) { return ASSET_BASE + '/' + slug + '-150x230.png'; }
    function esc(s) { const d = document.createElement('div'); d.textContent = s || ''; return d.innerHTML; }

    // ── Tool visibility helpers ──
    function showTool(id) {
        const el = document.getElementById(id);
        if (!el) return;
        el.style.display = '';
        requestAnimationFrame(() => {
            el.classList.add('tool-visible');
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    }

    function hideTool(id) {
        const el = document.getElementById(id);
        if (!el) return;
        el.classList.remove('tool-visible');
        setTimeout(() => { el.style.display = 'none'; }, 350);
    }

    // ══════════════════════════════════════════
    //  TOOLS HUB – CTA buttons
    // ══════════════════════════════════════════
    function initHub() {
        const openTier = document.getElementById('openTierListBtn');
        const openCompare = document.getElementById('openCompareBtn');
        const openSquad = document.getElementById('openSquadBtn');

        if (openTier) openTier.addEventListener('click', () => showTool('inlineTierlist'));
        if (openCompare) openCompare.addEventListener('click', () => showTool('compareSection'));
        if (openSquad) openSquad.addEventListener('click', () => showTool('squadSection'));

        // Close buttons
        document.getElementById('closeTierListBtn')?.addEventListener('click', () => hideTool('inlineTierlist'));
        document.getElementById('closeCompareBtn')?.addEventListener('click', () => hideTool('compareSection'));
        document.getElementById('closeSquadBtn')?.addEventListener('click', () => hideTool('squadSection'));
    }

    // ══════════════════════════════════════════
    //  INLINE TIER LIST – drag & drop
    // ══════════════════════════════════════════
    function initInlineTierList() {
        const container = document.getElementById('inlineTierlist');
        if (!container) return;

        const allRunners = container.querySelectorAll('.tier-weapon');
        const dropZones = container.querySelectorAll('.tier-drop-zone, .tier-pool-zone');
        let draggedEl = null;

        // Drag start/end
        allRunners.forEach(el => {
            el.addEventListener('dragstart', e => {
                draggedEl = el;
                el.classList.add('dragging');
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', el.dataset.slug);
            });
            el.addEventListener('dragend', () => {
                el.classList.remove('dragging');
                draggedEl = null;
                dropZones.forEach(z => z.classList.remove('drag-over'));
            });
        });

        // Drop zones
        dropZones.forEach(zone => {
            zone.addEventListener('dragover', e => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                zone.classList.add('drag-over');
                const after = getDragAfter(zone, e.clientY);
                if (draggedEl) {
                    if (!after) zone.appendChild(draggedEl);
                    else zone.insertBefore(draggedEl, after);
                }
            });
            zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
            zone.addEventListener('drop', e => { e.preventDefault(); zone.classList.remove('drag-over'); });
        });

        function getDragAfter(cont, y) {
            const els = [...cont.querySelectorAll('.tier-weapon:not(.dragging)')];
            return els.reduce((closest, child) => {
                const box = child.getBoundingClientRect();
                const offset = y - box.top - box.height / 2;
                if (offset < 0 && offset > closest.offset) return { offset, element: child };
                return closest;
            }, { offset: Number.NEGATIVE_INFINITY }).element;
        }

        // Touch support
        let touchEl = null, touchClone = null, touchSX, touchSY;

        allRunners.forEach(el => {
            el.addEventListener('touchstart', e => {
                touchEl = el;
                touchSX = e.touches[0].clientX;
                touchSY = e.touches[0].clientY;
            }, { passive: true });
        });

        document.addEventListener('touchmove', e => {
            if (!touchEl) return;
            e.preventDefault();
            const t = e.touches[0];
            if (!touchClone) {
                if (Math.abs(t.clientX - touchSX) < 8 && Math.abs(t.clientY - touchSY) < 8) return;
                touchClone = touchEl.cloneNode(true);
                touchClone.style.cssText = 'position:fixed;z-index:9999;pointer-events:none;opacity:0.85;transform:scale(1.05)';
                document.body.appendChild(touchClone);
                touchEl.classList.add('dragging');
            }
            touchClone.style.left = (t.clientX - 40) + 'px';
            touchClone.style.top = (t.clientY - 15) + 'px';
            dropZones.forEach(z => z.classList.remove('drag-over'));
            const under = document.elementFromPoint(t.clientX, t.clientY);
            const zone = under?.closest('.tier-drop-zone, .tier-pool-zone');
            if (zone) zone.classList.add('drag-over');
        }, { passive: false });

        document.addEventListener('touchend', e => {
            if (!touchEl) return;
            if (touchClone) {
                const t = e.changedTouches[0];
                const under = document.elementFromPoint(t.clientX, t.clientY);
                const zone = under?.closest('.tier-drop-zone, .tier-pool-zone');
                if (zone) zone.appendChild(touchEl);
                touchClone.remove();
                touchClone = null;
            }
            touchEl.classList.remove('dragging');
            dropZones.forEach(z => z.classList.remove('drag-over'));
            touchEl = null;
        });

        // Share
        document.getElementById('inlineTierShareBtn')?.addEventListener('click', () => {
            const state = {};
            container.querySelectorAll('.tier-drop-zone').forEach(zone => {
                const tier = zone.dataset.tier;
                const slugs = [...zone.querySelectorAll('.tier-weapon')].map(w => w.dataset.slug);
                if (slugs.length) state[tier] = slugs;
            });
            if (!Object.keys(state).length) return;
            const encoded = btoa(JSON.stringify(state));
            const url = window.location.origin + '/marathon/runners/tier-list/?t=' + encoded;
            navigator.clipboard.writeText(url).then(() => {
                const s = document.getElementById('inlineTierShareStatus');
                if (s) { s.classList.add('visible'); setTimeout(() => s.classList.remove('visible'), 2500); }
            });
        });

        // Reset
        document.getElementById('inlineTierResetBtn')?.addEventListener('click', () => {
            const pool = container.querySelector('.tier-pool-zone');
            container.querySelectorAll('.tier-drop-zone .tier-weapon').forEach(w => pool.appendChild(w));
        });
    }

    // ══════════════════════════════════════════
    //  SQUAD BUILDER
    // ══════════════════════════════════════════
    function initSquadBuilder() {
        const section = document.getElementById('squadSection');
        if (!section) return;

        const squad = [null, null, null]; // 3 slots

        function getExcluded() { return squad.filter(Boolean).map(r => r.slug); }

        function renderSlots() {
            for (let i = 0; i < 3; i++) {
                const slotEl = section.querySelector('.squad-slot[data-slot="' + (i + 1) + '"]');
                if (!slotEl) continue;
                const r = squad[i];
                if (r) {
                    slotEl.innerHTML =
                        '<div class="squad-slot-number">' + (i + 1) + '</div>' +
                        '<img src="' + getImg(r.slug) + '" alt="' + esc(r.name) + '" class="squad-slot-img" onerror="this.style.display=\'none\'">' +
                        '<div class="squad-slot-info">' +
                            '<div class="squad-slot-name">' + esc(r.name) + '</div>' +
                            '<div class="squad-slot-role">' + esc(r.role) + '</div>' +
                        '</div>' +
                        '<button class="squad-slot-remove" data-idx="' + i + '" title="Remove">✕</button>';
                    slotEl.classList.add('squad-slot--filled');
                } else {
                    slotEl.innerHTML =
                        '<div class="squad-slot-number">' + (i + 1) + '</div>' +
                        '<div class="squad-slot-empty">' +
                            '<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="8" r="4"/><path d="M5 20v-1a7 7 0 0 1 14 0v1"/></svg>' +
                            '<span>Pick Runner</span>' +
                        '</div>';
                    slotEl.classList.remove('squad-slot--filled');
                }
            }

            // Remove buttons
            section.querySelectorAll('.squad-slot-remove').forEach(btn => {
                btn.addEventListener('click', e => {
                    e.stopPropagation();
                    squad[parseInt(btn.dataset.idx)] = null;
                    renderSlots();
                    updateShareBtn();
                });
            });

            updateShareBtn();
            renderResult();
        }

        function updateShareBtn() {
            const btn = document.getElementById('squadShareBtn');
            const filled = squad.filter(Boolean).length;
            if (btn) {
                btn.disabled = filled < 3;
                btn.classList.toggle('squad-share--ready', filled >= 3);
            }
        }

        function renderResult() {
            const result = document.getElementById('squadResult');
            if (!result) return;
            const filled = squad.filter(Boolean);
            if (filled.length < 3) { result.style.display = 'none'; return; }

            result.style.display = 'block';
            result.innerHTML =
                '<div class="squad-result-banner">' +
                    '<div class="squad-result-label">YOUR EXTRACTION SQUAD</div>' +
                    '<div class="squad-result-runners">' +
                        filled.map(r =>
                            '<div class="squad-result-runner">' +
                                '<img src="' + getImg(r.slug) + '" alt="' + esc(r.name) + '" onerror="this.style.display=\'none\'">' +
                                '<span>' + esc(r.name) + '</span>' +
                            '</div>'
                        ).join('<span class="squad-result-plus">+</span>') +
                    '</div>' +
                '</div>';
        }

        function openPicker(slotIdx) {
            const excluded = getExcluded();
            const available = RUNNERS.filter(r => !excluded.includes(r.slug));

            const overlay = document.createElement('div');
            overlay.className = 'compare-listing-picker-overlay';
            overlay.innerHTML =
                '<div class="compare-listing-picker">' +
                    '<div class="compare-listing-picker-header">' +
                        '<span>Choose Runner ' + (slotIdx + 1) + '</span>' +
                        '<button class="compare-listing-picker-close">' +
                            '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>' +
                        '</button>' +
                    '</div>' +
                    '<div class="compare-listing-picker-grid">' +
                    available.map(r =>
                        '<button class="compare-listing-picker-item" data-slug="' + r.slug + '">' +
                            '<img src="' + getImg(r.slug) + '" alt="' + esc(r.name) + '" onerror="this.style.display=\'none\'" loading="lazy">' +
                            '<div class="compare-listing-picker-name">' + esc(r.name) + '</div>' +
                            '<div class="compare-listing-picker-role">' + esc(r.role) + '</div>' +
                        '</button>'
                    ).join('') +
                    '</div>' +
                '</div>';

            document.body.appendChild(overlay);

            overlay.querySelector('.compare-listing-picker-close').addEventListener('click', () => overlay.remove());
            overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
            overlay.querySelectorAll('.compare-listing-picker-item').forEach(btn => {
                btn.addEventListener('click', () => {
                    const r = RUNNERS.find(x => x.slug === btn.dataset.slug);
                    if (r) { squad[slotIdx] = r; renderSlots(); }
                    overlay.remove();
                });
            });
        }

        // Slot click handlers (event delegation)
        section.querySelector('#squadSlots').addEventListener('click', e => {
            const slot = e.target.closest('.squad-slot');
            if (!slot) return;
            if (e.target.closest('.squad-slot-remove')) return; // handled separately
            const idx = parseInt(slot.dataset.slot) - 1;
            openPicker(idx);
        });

        // Share
        document.getElementById('squadShareBtn')?.addEventListener('click', () => {
            const slugs = squad.filter(Boolean).map(r => r.slug);
            if (slugs.length < 3) return;
            const encoded = btoa(JSON.stringify(slugs));
            const url = window.location.origin + '/marathon/runners/?squad=' + encoded;
            navigator.clipboard.writeText(url).then(() => {
                const s = document.getElementById('squadShareStatus');
                if (s) { s.classList.add('visible'); setTimeout(() => s.classList.remove('visible'), 2500); }
            });
        });

        // Reset
        document.getElementById('squadResetBtn')?.addEventListener('click', () => {
            squad[0] = squad[1] = squad[2] = null;
            renderSlots();
            const result = document.getElementById('squadResult');
            if (result) { result.style.display = 'none'; result.innerHTML = ''; }
        });

        // Load from URL
        try {
            const p = new URLSearchParams(window.location.search);
            const sq = p.get('squad');
            if (sq) {
                const slugs = JSON.parse(atob(sq));
                slugs.forEach((slug, i) => {
                    if (i < 3) squad[i] = RUNNERS.find(r => r.slug === slug) || null;
                });
                showTool('squadSection');
                renderSlots();
            }
        } catch (_) { /* ignore bad URLs */ }

        renderSlots();
    }

    // ── Init all on DOMContentLoaded ──
    document.addEventListener('DOMContentLoaded', () => {
        initHub();
        initInlineTierList();
        initSquadBuilder();
    });
})();
