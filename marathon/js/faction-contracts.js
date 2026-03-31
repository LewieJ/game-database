// Faction Hub — Contract Preview Cards
// Loads contracts for the current faction and renders clickable preview cards

(function () {
    'use strict';

    document.addEventListener('DOMContentLoaded', init);

    async function init() {
        const container = document.getElementById('factionContractsGrid');
        if (!container) return;

        const slug = getFactionSlug();
        if (!slug) return;

        try {
            const result = await MarathonAPI.getFactionContracts(slug);
            const contracts = result?.contracts || result?.data || [];

            if (contracts.length === 0) {
                container.innerHTML = `
                    <div class="fh-coming-soon">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/>
                            <path d="M14 2v6h6"/>
                        </svg>
                        <p>No contracts available yet. Check back soon!</p>
                    </div>`;
                return;
            }

            container.innerHTML = contracts.map(c => renderCard(c)).join('');
        } catch (err) {
            console.warn('Could not load faction contracts:', err);
            container.innerHTML = `
                <div class="fh-coming-soon">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/>
                        <path d="M14 2v6h6"/>
                    </svg>
                    <p>No contracts available yet. Check back soon!</p>
                </div>`;
        }
    }

    function getFactionSlug() {
        const parts = window.location.pathname.split('/').filter(Boolean);
        // URL: /factions/{slug}/
        if (parts.length >= 2 && parts[0] === 'factions') {
            return parts[1];
        }
        return null;
    }

    function renderCard(c) {
        const slug = c.slug || '';
        const name = esc(c.name || 'Untitled');
        const desc = esc(c.description || '');
        const type = c.contract_type || '';
        const typeLabel = capitalize(type);
        const diff = c.difficulty || '';
        const diffLabel = capitalize(diff);
        const factionColor = c.faction_color || c.faction?.color_surface || 'var(--faction-color, #666)';

        // Steps count
        const steps = c.steps || c.objectives || [];
        const stepCount = Array.isArray(steps) && steps.length > 0 ? steps.length : (c.step_count || 0);

        // Rep reward — try multiple field names for compatibility
        const rep = c.total_reputation || c.reward_preview?.total_reputation || c.reputation_reward || c.rep_reward || 0;

        // Tag dots — handle string[], TagObject[], or null
        const tagDots = (c.tag_objects || c.tags || []).map(t => {
            if (typeof t === 'string') return `<span class="contract-tag-dot" title="${esc(capitalize(t))}"></span>`;
            return `<span class="contract-tag-dot" style="background:${t.color || '#666'}" title="${esc(t.name || '')}"></span>`;
        }).join('');

        return `
            <a href="/contracts/${slug}/" class="contract-card" style="--faction-color:${factionColor}">
                <div class="contract-card-top">
                    ${typeLabel ? `<span class="contract-type-badge ${type}">${typeLabel}</span>` : ''}
                    ${diffLabel ? `<span class="contract-diff-badge ${diff}">${diffLabel}</span>` : ''}
                    ${tagDots ? `<div class="contract-card-tags">${tagDots}</div>` : ''}
                </div>
                <h3>${name}</h3>
                ${desc ? `<p class="contract-card-desc">${desc}</p>` : ''}
                <div class="contract-card-meta">
                    ${stepCount > 0 ? `
                    <span class="contract-meta-item">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
                        ${stepCount} step${stepCount !== 1 ? 's' : ''}
                    </span>` : ''}
                    ${rep ? `
                    <span class="contract-meta-item">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                        +${rep} Rep
                    </span>` : ''}
                </div>
            </a>`;
    }

    function esc(text) {
        if (!text) return '';
        const d = document.createElement('div');
        d.textContent = text;
        return d.innerHTML;
    }

    function capitalize(str) {
        if (!str) return '';
        return str.charAt(0).toUpperCase() + str.slice(1);
    }
})();
