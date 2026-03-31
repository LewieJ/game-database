/**
 * Contracts Listing — Client-side Filtering & Walkthrough Toggle
 *
 * Handles:
 *  - Type / difficulty / tag chip filters on listing pages
 *  - Step walkthrough expand/collapse on detail pages
 */

(function () {
    'use strict';

    // ── Listing page filters ──────────────────────────────────────

    const grid = document.getElementById('contractsGrid');
    const emptyMsg = document.getElementById('contractsEmpty');
    if (grid) initFilters();

    function initFilters() {
        const state = { type: 'all', difficulty: 'all', tags: new Set() };
        const chips = document.querySelectorAll('.filter-chip, .tag-chip');

        chips.forEach(chip => {
            chip.addEventListener('click', () => {
                const filterKind = chip.dataset.filter;
                const value = chip.dataset.value;

                if (filterKind === 'tag') {
                    // Tags are toggle-based (multi-select)
                    if (state.tags.has(value)) {
                        state.tags.delete(value);
                        chip.classList.remove('active');
                    } else {
                        state.tags.add(value);
                        chip.classList.add('active');
                    }
                } else {
                    // Type / Difficulty are single-select
                    state[filterKind] = value;
                    const group = chip.closest('.contracts-filter-group');
                    if (group) {
                        group.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
                    }
                    chip.classList.add('active');
                }

                applyFilters(state);
            });
        });
    }

    function applyFilters(state) {
        const cards = grid.querySelectorAll('.contract-card');
        let visible = 0;

        cards.forEach(card => {
            const cardType = card.dataset.type || '';
            const cardDiff = card.dataset.difficulty || '';
            const cardTags = (card.dataset.tags || '').split(',').filter(Boolean);

            const typeMatch = state.type === 'all' || cardType === state.type;
            const diffMatch = state.difficulty === 'all' || cardDiff === state.difficulty;
            const tagMatch = state.tags.size === 0 || cardTags.some(t => state.tags.has(t));

            if (typeMatch && diffMatch && tagMatch) {
                card.style.display = '';
                visible++;
            } else {
                card.style.display = 'none';
            }
        });

        if (emptyMsg) {
            emptyMsg.style.display = visible === 0 ? '' : 'none';
        }
    }

    // ── Detail page: walkthrough toggles ──────────────────────────

    document.querySelectorAll('.step-walkthrough-toggle').forEach(btn => {
        btn.addEventListener('click', function () {
            this.classList.toggle('open');
            const content = this.nextElementSibling;
            if (content) content.classList.toggle('show');
        });
    });
})();
