// Contracts Listing Page
// Fetches all contracts and renders a searchable, filterable table

(function () {
    'use strict';

    const CONTRACTS_API = 'https://marathon-contracts-api.heymarathondb.workers.dev';

    // ── State ──
    let allContracts = [];
    let filteredContracts = [];
    let factions = [];
    let maps = new Set();
    let currentPage = 1;
    const PAGE_SIZE = 20;

    // ── DOM refs ──
    const contractSearch = document.getElementById('contractSearch');
    const filterFaction = document.getElementById('filterFaction');
    const filterType = document.getElementById('filterType');
    const filterDifficulty = document.getElementById('filterDifficulty');
    const filterMap = document.getElementById('filterMap');
    const sortContracts = document.getElementById('sortContracts');
    const resetBtn = document.getElementById('resetFilters');
    const contractCount = document.getElementById('contractCount');
    const contractsBody = document.getElementById('contractsBody');
    const loadingState = document.getElementById('loadingState');
    const tableWrap = document.getElementById('tableWrap');
    const emptyState = document.getElementById('emptyState');
    const emptyReset = document.getElementById('emptyReset');
    const pagination = document.getElementById('pagination');
    const pageNumbers = document.getElementById('pageNumbers');
    const prevPage = document.getElementById('prevPage');
    const nextPage = document.getElementById('nextPage');

    // ── Init ──
    document.addEventListener('DOMContentLoaded', init);

    async function init() {
        setupEventListeners();
        setupContractModal();
        checkContractUrlParam();
        await loadContracts();
    }

    // ── Data loading ──
    async function loadContracts() {
        try {
            const result = await MarathonAPI.getContracts();
            if (!result || !result.success) {
                showEmpty();
                return;
            }

            allContracts = result.data || [];

            // Extract unique factions and maps for filter dropdowns
            const factionMap = new Map();
            allContracts.forEach(c => {
                if (c.faction_slug && c.faction_name) {
                    factionMap.set(c.faction_slug, {
                        slug: c.faction_slug,
                        name: c.faction_name,
                        icon: c.faction_icon || null
                    });
                }
                if (c.map_slug) {
                    maps.add(c.map_slug);
                }
            });

            factions = Array.from(factionMap.values()).sort((a, b) => a.name.localeCompare(b.name));

            // Also try meta counts if available
            if (result.meta && result.meta.by_faction) {
                Object.keys(result.meta.by_faction).forEach(slug => {
                    if (!factionMap.has(slug)) {
                        factionMap.set(slug, { slug, name: capitalize(slug), icon: null });
                    }
                });
                factions = Array.from(factionMap.values()).sort((a, b) => a.name.localeCompare(b.name));
            }

            populateFilterDropdowns();
            applyFilters();
        } catch (err) {
            console.error('Failed to load contracts:', err);
            showEmpty();
        }
    }

    function populateFilterDropdowns() {
        // Factions
        factions.forEach(f => {
            const opt = document.createElement('option');
            opt.value = f.slug;
            opt.textContent = f.name;
            filterFaction.appendChild(opt);
        });

        // Maps
        const sortedMaps = Array.from(maps).sort();
        sortedMaps.forEach(m => {
            const opt = document.createElement('option');
            opt.value = m;
            opt.textContent = formatMapName(m);
            filterMap.appendChild(opt);
        });
    }

    // ── Filtering & sorting ──
    function applyFilters() {
        const search = (contractSearch.value || '').toLowerCase().trim();
        const faction = filterFaction.value;
        const type = filterType.value;
        const difficulty = filterDifficulty.value;
        const map = filterMap.value;

        filteredContracts = allContracts.filter(c => {
            if (faction && c.faction_slug !== faction) return false;
            if (type && c.contract_type !== type) return false;
            if (difficulty && c.difficulty !== difficulty) return false;
            if (map && c.map_slug !== map) return false;
            if (search) {
                // tags may be string[] and tag_objects may be TagObject[]
                const tagNames = (c.tag_objects || []).map(t => t.name || '');
                const haystack = [
                    c.name,
                    c.description,
                    c.faction_name,
                    c.contract_type,
                    c.difficulty,
                    c.map_slug,
                    c.reward_summary,
                    ...(c.tags || []),
                    ...tagNames
                ].filter(Boolean).join(' ').toLowerCase();
                if (!haystack.includes(search)) return false;
            }
            return true;
        });

        // Sort
        const sortVal = sortContracts.value;
        filteredContracts.sort((a, b) => {
            switch (sortVal) {
                case 'name-asc':
                    return (a.name || '').localeCompare(b.name || '');
                case 'name-desc':
                    return (b.name || '').localeCompare(a.name || '');
                case 'difficulty-asc':
                    return (a.difficulty_rating || 0) - (b.difficulty_rating || 0);
                case 'difficulty-desc':
                    return (b.difficulty_rating || 0) - (a.difficulty_rating || 0);
                case 'steps-asc':
                    return (a.step_count || 0) - (b.step_count || 0);
                case 'steps-desc':
                    return (b.step_count || 0) - (a.step_count || 0);
                default:
                    return 0;
            }
        });

        // Update count
        contractCount.textContent = filteredContracts.length;

        // Show/hide reset button
        const hasActiveFilter = faction || type || difficulty || map || search;
        resetBtn.style.display = hasActiveFilter ? 'flex' : 'none';

        // Reset to page 1
        currentPage = 1;
        renderPage();
    }

    function renderPage() {
        if (filteredContracts.length === 0) {
            showEmpty();
            return;
        }

        loadingState.style.display = 'none';
        emptyState.style.display = 'none';
        tableWrap.style.display = '';

        const totalPages = Math.ceil(filteredContracts.length / PAGE_SIZE);
        const start = (currentPage - 1) * PAGE_SIZE;
        const end = start + PAGE_SIZE;
        const pageItems = filteredContracts.slice(start, end);

        // Render rows
        contractsBody.innerHTML = pageItems.map(c => renderRow(c)).join('');

        // Pagination
        if (totalPages > 1) {
            pagination.style.display = 'flex';
            renderPagination(totalPages);
        } else {
            pagination.style.display = 'none';
        }
    }

    function renderRow(c) {
        const typeClass = c.contract_type || 'permanent';
        const typeLabel = capitalize(c.contract_type || 'unknown');
        const diffLabel = c.difficulty ? capitalize(c.difficulty) : '';
        const diffClass = c.difficulty || '';
        const mapLabel = c.map_slug ? formatMapName(c.map_slug) : 'Any';
        const factionIcon = c.faction_icon
            ? `<img src="${c.faction_icon}" alt="${c.faction_name || ''}" class="cl-faction-icon" loading="lazy">`
            : '';
        const factionName = c.faction_name || '';
        const slug = c.slug || '';

        // Steps preview - show step_count and reward info
        const stepsInfo = [];
        if (c.step_count) {
            stepsInfo.push(`${c.step_count} step${c.step_count !== 1 ? 's' : ''}`);
        }
        if (c.reward_summary) {
            stepsInfo.push(c.reward_summary);
        } else if (c.reward_preview && c.reward_preview.total_reputation) {
            stepsInfo.push(`+${c.reward_preview.total_reputation} Rep`);
        }

        // Chain badge
        const chainBadge = c.chain_position
            ? `<span class="cl-chain-badge" title="Part of a quest chain">${c.chain_position}/${c.chain_total}</span>`
            : '';

        // Build the contract detail URL
        // For now, link to the faction-based contract detail page if it exists
        const href = slug ? `/contracts/${slug}/` : '#';

        return `
        <tr class="cl-row" data-slug="${escapeHtml(slug)}" role="button" tabindex="0" aria-label="View contract: ${escapeHtml(c.name || '')}">
            <td class="cl-td-title">
                <div class="cl-title-wrap">
                    <a href="${href}" class="cl-title-link" tabindex="-1">${escapeHtml(c.name || 'Untitled')}</a>
                    <div class="cl-title-meta">
                        <span class="cl-type-badge ${typeClass}">${typeLabel}</span>
                        ${diffLabel ? `<span class="cl-diff-badge ${diffClass}">${diffLabel}</span>` : ''}
                        ${chainBadge}
                    </div>
                </div>
            </td>
            <td class="cl-td-maps">
                <span class="cl-map-tag">${mapLabel}</span>
            </td>
            <td class="cl-td-faction">
                <div class="cl-faction-cell">
                    ${factionIcon}
                    <span class="cl-faction-name">${escapeHtml(factionName)}</span>
                </div>
            </td>
            <td class="cl-td-steps">
                <span class="cl-steps-text">${stepsInfo.join(' · ')}</span>
            </td>
        </tr>`;
    }

    function renderPagination(totalPages) {
        prevPage.disabled = currentPage <= 1;
        nextPage.disabled = currentPage >= totalPages;

        let html = '';
        const maxVisible = 5;
        let startP = Math.max(1, currentPage - Math.floor(maxVisible / 2));
        let endP = Math.min(totalPages, startP + maxVisible - 1);
        if (endP - startP < maxVisible - 1) {
            startP = Math.max(1, endP - maxVisible + 1);
        }

        if (startP > 1) {
            html += `<button class="cl-page-num" data-page="1">1</button>`;
            if (startP > 2) html += `<span class="cl-page-dots">…</span>`;
        }

        for (let i = startP; i <= endP; i++) {
            const active = i === currentPage ? ' active' : '';
            html += `<button class="cl-page-num${active}" data-page="${i}">${i}</button>`;
        }

        if (endP < totalPages) {
            if (endP < totalPages - 1) html += `<span class="cl-page-dots">…</span>`;
            html += `<button class="cl-page-num" data-page="${totalPages}">${totalPages}</button>`;
        }

        pageNumbers.innerHTML = html;
    }

    // ── Event listeners ──
    function setupEventListeners() {
        // Debounced search
        let searchTimer;
        contractSearch.addEventListener('input', () => {
            clearTimeout(searchTimer);
            searchTimer = setTimeout(applyFilters, 200);
        });

        // Filter selects
        filterFaction.addEventListener('change', applyFilters);
        filterType.addEventListener('change', applyFilters);
        filterDifficulty.addEventListener('change', applyFilters);
        filterMap.addEventListener('change', applyFilters);
        sortContracts.addEventListener('change', applyFilters);

        // Reset
        resetBtn.addEventListener('click', resetAllFilters);
        emptyReset.addEventListener('click', resetAllFilters);

        // Pagination
        prevPage.addEventListener('click', () => {
            if (currentPage > 1) {
                currentPage--;
                renderPage();
                scrollToTable();
            }
        });

        nextPage.addEventListener('click', () => {
            const totalPages = Math.ceil(filteredContracts.length / PAGE_SIZE);
            if (currentPage < totalPages) {
                currentPage++;
                renderPage();
                scrollToTable();
            }
        });

        pageNumbers.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-page]');
            if (btn) {
                currentPage = parseInt(btn.dataset.page, 10);
                renderPage();
                scrollToTable();
            }
        });

        // Row clicks → open modal
        contractsBody.addEventListener('click', (e) => {
            const row = e.target.closest('.cl-row[data-slug]');
            if (row) {
                e.preventDefault();
                openContractModal(row.dataset.slug);
            }
        });

        // Keyboard nav on rows
        contractsBody.addEventListener('keydown', (e) => {
            if ((e.key === 'Enter' || e.key === ' ') && e.target.closest('.cl-row[data-slug]')) {
                e.preventDefault();
                openContractModal(e.target.closest('.cl-row').dataset.slug);
            }
        });

        // Browser back/forward
        window.addEventListener('popstate', (e) => {
            if (e.state && e.state.contractSlug) {
                openContractModal(e.state.contractSlug, true);
            } else {
                closeContractModal(true);
            }
        });
    }

    function resetAllFilters() {
        contractSearch.value = '';
        filterFaction.value = '';
        filterType.value = '';
        filterDifficulty.value = '';
        filterMap.value = '';
        sortContracts.value = 'name-asc';
        applyFilters();
    }

    // ── UI helpers ──
    function showEmpty() {
        loadingState.style.display = 'none';
        tableWrap.style.display = 'none';
        emptyState.style.display = 'flex';
        pagination.style.display = 'none';
    }

    function scrollToTable() {
        const el = document.querySelector('.cl-filters');
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    // ── Util ──
    function capitalize(str) {
        if (!str) return '';
        return str.charAt(0).toUpperCase() + str.slice(1).replace(/_/g, ' ');
    }

    function formatMapName(slug) {
        if (!slug) return 'Any';
        return slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    }

    function escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    // ─── Contract Modal ──────────────────────────────────────────────

    function setupContractModal() {
        document.getElementById('contractModalBackdrop')
            ?.addEventListener('click', () => closeContractModal());
        document.getElementById('contractModalClose')
            ?.addEventListener('click', () => closeContractModal());
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') closeContractModal();
        });
    }

    function checkContractUrlParam() {
        const slug = new URLSearchParams(window.location.search).get('contract');
        if (slug) openContractModal(slug, true);
    }

    async function openContractModal(slug, skipPush) {
        if (!slug) return;
        const modal = document.getElementById('contractModal');
        if (!modal) return;
        modal.hidden = false;
        document.body.classList.add('modal-open');

        const body   = document.getElementById('contractModalBody');
        const badges = document.getElementById('contractModalBadges');
        if (body)   body.innerHTML   = '<div class="loading-spinner" style="margin:64px auto"></div>';
        if (badges) badges.innerHTML = '';

        if (!skipPush) {
            history.pushState({ contractSlug: slug }, '', `?contract=${slug}`);
        }

        try {
            const res  = await fetch(`${CONTRACTS_API}/api/contracts/${slug}`);
            const json = await res.json();
            renderContractModal(json.contract || json.data || json);
        } catch {
            if (body) body.innerHTML = `
                <div class="fh-empty-state">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>
                    <p>Could not load contract details. Try again shortly.</p>
                </div>`;
        }
    }

    function closeContractModal(skipPush) {
        const modal = document.getElementById('contractModal');
        if (!modal || modal.hidden) return;
        modal.hidden = true;
        document.body.classList.remove('modal-open');
        if (!skipPush) {
            history.pushState({}, '', window.location.pathname);
        }
    }

    function renderContractModal(c) {
        const badgesEl = document.getElementById('contractModalBadges');
        const bodyEl   = document.getElementById('contractModalBody');
        if (!bodyEl) return;

        // Badges header
        if (badgesEl) {
            badgesEl.innerHTML = [
                c.contract_type && `<span class="fh-contract-type ${c.contract_type}">${capitalize(c.contract_type)}</span>`,
                c.difficulty    && `<span class="fh-contract-diff ${c.difficulty}">${capitalize(c.difficulty)}</span>`,
                c.scope         && `<span class="fh-contract-scope">${formatScope(c.scope)}</span>`,
                c.map_slug && c.map_slug !== 'any-zone' && `<span class="fh-contract-scope">${capitalize(c.map_slug)}</span>`,
                c.is_repeatable && `<span class="fh-contract-scope">Repeatable</span>`,
                !c.is_active    && `<span class="fh-contract-scope" style="opacity:.5">Inactive</span>`,
            ].filter(Boolean).join('');
        }

        // Chain
        const chainHtml = (c.chain_slug && c.chain_position && c.chain_total) ? `
            <div class="fhm-chain">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                Part ${c.chain_position} of ${c.chain_total} in quest chain
            </div>` : '';

        // Meta chips
        const metaItems = [
            c.faction?.agent_name && metaChip(`<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>Agent: ${escapeHtml(c.faction.agent_name)}`),
            (c.estimated_time_range || c.estimated_time_minutes) && metaChip(`<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>${escapeHtml(c.estimated_time_range || ('~' + c.estimated_time_minutes + ' min'))}`),
            c.required_rank  && metaChip(`<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>Rank ${c.required_rank} required`),
            c.cooldown_hours && metaChip(`<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>${c.cooldown_hours}h cooldown`),
            c.total_reputation && metaChip(`<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>+${c.total_reputation} Rep`, 'fhm-rep'),
        ].filter(Boolean);
        const metaHtml = metaItems.length ? `<div class="fhm-meta">${metaItems.join('')}</div>` : '';

        // Tags
        const tagsHtml = (c.tags && c.tags.length)
            ? `<div class="fhm-tags">${c.tags.map(t => `<span class="fh-contract-tag" style="--tag-color:#888">${escapeHtml(typeof t === 'string' ? t : (t.name || t))}</span>`).join('')}</div>`
            : '';

        // Story / flavor
        const storyHtml = [
            c.flavor_text && `<p class="fhm-flavor">\u201c${escapeHtml(c.flavor_text)}\u201d</p>`,
            c.story_text  && `<p class="fhm-story">${escapeHtml(c.story_text)}</p>`,
        ].filter(Boolean).join('');

        // Steps
        let stepsHtml = '';
        if (c.steps && c.steps.length) {
            const inner = c.steps.map(s => {
                const label      = s.name || s.description || ('Step ' + s.step_number);
                const countBadge = s.count > 1 ? `<span class="fhm-step-count">\xd7${s.count}</span>` : '';
                const mapBadge   = s.map_slug && s.map_slug !== 'any-zone' ? `<span class="fhm-step-map">${capitalize(s.map_slug)}</span>` : '';
                const hintBadge  = s.location_hint ? `<span class="fhm-step-hint">${escapeHtml(s.location_hint)}</span>` : '';
                const wt = s.walkthrough ? `<div class="fhm-step-walkthrough">${escapeHtml(s.walkthrough)}</div>` : '';
                const rw = s.rewards && s.rewards.length ? `<div class="fhm-step-rewards">${renderRewardPills(s.rewards)}</div>` : '';
                return `
                    <div class="fhm-step">
                        <div class="fhm-step-num">${s.step_number}</div>
                        <div class="fhm-step-content">
                            <div class="fhm-step-label">${escapeHtml(label)}${countBadge}${mapBadge}${hintBadge}</div>
                            ${wt}${rw}
                        </div>
                    </div>`;
            }).join('');
            stepsHtml = fhmSection(
                `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg> Objectives \u2014 ${c.steps.length} Step${c.steps.length !== 1 ? 's' : ''}`,
                `<div class="fhm-steps">${inner}</div>`
            );
        } else if (c.description) {
            stepsHtml = `<div class="fhm-section"><p class="fhm-desc">${escapeHtml(c.description)}</p></div>`;
        }

        // Completion rewards
        let rewardsHtml = '';
        if (c.completion_rewards && c.completion_rewards.length) {
            const guar = c.completion_rewards.filter(r => r.is_guaranteed);
            const poss = c.completion_rewards.filter(r => !r.is_guaranteed);
            rewardsHtml = fhmSection(
                `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 12V22H4V12"/><path d="M22 7H2v5h20V7z"/><path d="M12 22V7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg> Completion Rewards`,
                [
                    guar.length && `<div class="fhm-rewards-group"><span class="fhm-rewards-label">Guaranteed</span><div class="fhm-reward-pills">${renderRewardPills(guar)}</div></div>`,
                    poss.length && `<div class="fhm-rewards-group"><span class="fhm-rewards-label">Possible</span><div class="fhm-reward-pills">${renderRewardPills(poss)}</div></div>`,
                ].filter(Boolean).join('')
            );
        }

        // Tips
        const tipsHtml = (c.tips && c.tips.length) ? fhmSection(
            `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg> Tips`,
            `<ul class="fhm-tips">${c.tips.map(t => '<li>' + escapeHtml(t) + '</li>').join('')}</ul>`
        ) : '';

        // Prerequisites
        const prereqHtml = (c.prerequisites && c.prerequisites.length) ? fhmSection('Prerequisites',
            `<div class="fhm-prereqs">${c.prerequisites.map(p => '<span class="fhm-prereq">' + escapeHtml(p.name || p) + '</span>').join('')}</div>`
        ) : '';

        // Related contracts
        let relatedHtml = '';
        if (c.related_contracts && c.related_contracts.length) {
            const btns = c.related_contracts.slice(0, 4).map(r => `
                <button class="fhm-related-btn" data-slug="${escapeHtml(r.slug)}">
                    ${r.contract_type ? `<span class="fh-contract-type ${r.contract_type}" style="font-size:.6rem;padding:1px 5px">${capitalize(r.contract_type)}</span>` : ''}
                    ${escapeHtml(r.name)}
                </button>`).join('');
            relatedHtml = fhmSection(
                `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg> Related Contracts`,
                `<div class="fhm-related">${btns}</div>`
            );
        }

        bodyEl.innerHTML = `
            <div class="fhm-name">${escapeHtml(c.name || 'Untitled')}</div>
            ${metaHtml}
            ${chainHtml}
            ${tagsHtml}
            ${storyHtml}
            ${stepsHtml}
            ${rewardsHtml}
            ${tipsHtml}
            ${prereqHtml}
            ${relatedHtml}
        `;

        bodyEl.querySelectorAll('.fhm-related-btn[data-slug]').forEach(btn => {
            btn.addEventListener('click', () => openContractModal(btn.dataset.slug));
        });
    }

    function metaChip(inner, extraClass) {
        return `<span class="fhm-meta-item${extraClass ? ' ' + extraClass : ''}">${inner}</span>`;
    }

    function fhmSection(titleHtml, bodyHtml) {
        return `<div class="fhm-section"><h3 class="fhm-section-title">${titleHtml}</h3>${bodyHtml}</div>`;
    }

    function renderRewardPills(rewards) {
        return rewards.map(r => {
            const icon   = r.icon_url
                ? `<img src="${escapeHtml(r.icon_url)}" alt="" width="14" height="14" style="object-fit:contain" onerror="this.style.display='none'">`
                : rewardEmoji(r.reward_type);
            const label  = escapeHtml(r.display_name || capitalize(r.reward_type));
            const amount = r.amount > 1 ? ` \xd7${r.amount}` : '';
            const chance = !r.is_guaranteed && r.drop_chance ? ` (${Math.round(r.drop_chance * 100)}%)` : '';
            const rar    = r.rarity ? ` <span class="fhm-reward-rarity">${capitalize(r.rarity)}</span>` : '';
            return `<span class="fhm-reward-pill ${r.reward_type || ''}">${icon}${label}${amount}${chance}${rar}</span>`;
        }).join('');
    }

    function rewardEmoji(type) {
        return ({ credits: '💰', reputation: '⭐', salvage: '🔩', weapon: '🔫',
                  weapon_mod: '🔧', cosmetic: '✨', upgrade_token: '🎫',
                  faction_token: '🏷️', item: '📦' })[type] || '📦';
    }

    function formatScope(scope) {
        return ({ single_run: 'Single Run', cumulative: 'Cumulative', multi_run: 'Multi-Run' })[scope] || capitalize(scope || '');
    }

})();
