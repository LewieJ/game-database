// Faction Hub — Main JS
// Tabs: Overview (rep methods, upgrades summary, cosmetics) | Contracts (list + detail modal)
// Contract modal supports URL deep-linking via ?contract=<slug>

(function () {
    'use strict';

    const CONTRACTS_API = 'https://marathon-contracts-api.heymarathondb.workers.dev';
    const ACCOUNTS_API  = 'https://accounts.marathondb.gg';
    const SKINS_API     = 'https://weaponskins.marathondb.gg';
    const ITEMS_API     = 'https://items.marathondb.gg';

    const FHU_CAT_LABELS = { inventory: 'Inventory', 'function': 'Function', armory: 'Armory', stat: 'Stat' };
    let _fhuItemsCache   = null;
    let _fhuCatFilter    = 'all';

    let factionData      = null;
    let factionSlug      = null;
    let allContracts     = [];
    let activeTypeFilter = '';

    // ── Auth / tracking state ──
    let _currentUser          = null;   // MDBAuth user object or null
    let _userCompletedContracts = [];   // [{ contract_slug }]
    let _userUpgrades         = [];     // [{ upgrade_slug, level }]
    let _userCapstones        = [];     // [{ capstone_rank }]

    document.addEventListener('DOMContentLoaded', init);

    async function init() {
        factionSlug = getFactionSlug();
        if (!factionSlug) return;

        setupTabs();
        setupContractModal();
        setupUpgradeModal();
        checkContractUrlParam();

        // Start auth check in parallel with data fetches
        const authPromise = (window.MDBAuth?.getUser?.() || Promise.resolve(null));

        const [factionRes, contractsRes, skinsRes] = await Promise.allSettled([
            fetchJSON(`${CONTRACTS_API}/api/factions/${factionSlug}`),
            fetchJSON(`${CONTRACTS_API}/api/factions/${factionSlug}/contracts`),
            fetchFactionSkins(factionSlug),
        ]);

        factionData  = factionRes.status   === 'fulfilled' ? (factionRes.value?.data   || factionRes.value) : null;
        allContracts = contractsRes.status === 'fulfilled' ? (contractsRes.value?.data || [])               : [];
        const skins  = skinsRes.status     === 'fulfilled' ? skinsRes.value                                 : [];

        // Resolve auth and fetch user tracking data
        try { _currentUser = await authPromise; } catch { _currentUser = null; }
        if (_currentUser?.user_id) {
            await loadUserTrackingData(_currentUser.user_id);
        }

        if (factionData) {
            renderRepMethods(factionData.reputation_methods || []);
            renderAgentInfo(factionData);
        }
        renderUpgradesOverview();
        renderContractsList(allContracts);
        renderCosmetics(skins);
        updateCounts(allContracts.length, skins.length);
        fetchItemsData();
    }

    // ─── User Tracking Data ─────────────────────────────────

    async function loadUserTrackingData(userId) {
        const uid = encodeURIComponent(userId);
        const fs = encodeURIComponent(factionSlug);
        const [contractsRes, upgradesRes] = await Promise.allSettled([
            fetch(`${ACCOUNTS_API}/contracts/${fs}?user_id=${uid}`, { credentials: 'include' }).then(r => r.json()),
            fetch(`${ACCOUNTS_API}/upgrades/${fs}?user_id=${uid}`, { credentials: 'include' }).then(r => r.json()),
        ]);
        if (contractsRes.status === 'fulfilled' && contractsRes.value?.success) {
            _userCompletedContracts = contractsRes.value.data.contracts || [];
        }
        if (upgradesRes.status === 'fulfilled' && upgradesRes.value?.success) {
            _userUpgrades  = upgradesRes.value.data.upgrades  || [];
            _userCapstones = upgradesRes.value.data.capstones || [];
        }
    }

    function isContractCompleted(slug) {
        return _userCompletedContracts.some(c => c.contract_slug === slug);
    }

    function isUpgradeLevelUnlocked(slug, level) {
        return _userUpgrades.some(u => u.upgrade_slug === slug && u.level === level);
    }

    function isCapstoneUnlocked(rank) {
        return _userCapstones.some(c => c.capstone_rank === rank);
    }

    async function toggleContractCompletion(contractSlug) {
        if (!_currentUser) return;
        try {
            const res = await fetch(`${ACCOUNTS_API}/contracts/${encodeURIComponent(factionSlug)}/toggle`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ contract_slug: contractSlug }),
            });
            if (!res.ok) return;
            const j = await res.json();
            if (!j.success) return;
            if (j.data.action === 'added') {
                _userCompletedContracts.push({ contract_slug: contractSlug, completed_at: new Date().toISOString() });
            } else {
                _userCompletedContracts = _userCompletedContracts.filter(c => c.contract_slug !== contractSlug);
            }
            renderContractsList(allContracts);
        } catch (e) { console.error('Toggle contract failed:', e); }
    }

    async function toggleUpgradeCompletion(upgradeSlug, level) {
        if (!_currentUser) return;
        try {
            const res = await fetch(`${ACCOUNTS_API}/upgrades/${encodeURIComponent(factionSlug)}/toggle`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ upgrade_slug: upgradeSlug, level }),
            });
            if (!res.ok) return;
            const j = await res.json();
            if (!j.success) return;
            if (j.data.action === 'added') {
                _userUpgrades.push({ upgrade_slug: upgradeSlug, level, unlocked_at: new Date().toISOString() });
            } else {
                _userUpgrades = _userUpgrades.filter(u => !(u.upgrade_slug === upgradeSlug && u.level === level));
            }
            const def = window.FACTION_UPGRADES?.[factionSlug];
            if (def) {
                renderFhuCards(def);
                // Re-render the modal if it's open
                const overlay = document.getElementById('fhuModal');
                if (overlay && !overlay.hidden) {
                    const u = def.upgrades.find(x => x.slug === upgradeSlug);
                    if (u) openFhuUpgradeModal(u, def);
                }
            }
        } catch (e) { console.error('Toggle upgrade failed:', e); }
    }

    async function toggleCapstoneCompletion(rank) {
        if (!_currentUser) return;
        try {
            const res = await fetch(`${ACCOUNTS_API}/upgrades/${encodeURIComponent(factionSlug)}/capstone/toggle`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ capstone_rank: rank }),
            });
            if (!res.ok) return;
            const j = await res.json();
            if (!j.success) return;
            if (j.data.action === 'added') {
                _userCapstones.push({ capstone_rank: rank, unlocked_at: new Date().toISOString() });
            } else {
                _userCapstones = _userCapstones.filter(c => c.capstone_rank !== rank);
            }
            const def = window.FACTION_UPGRADES?.[factionSlug];
            if (def) renderFhuCapstones(def);
        } catch (e) { console.error('Toggle capstone failed:', e); }
    }

    // ─── Helpers ────────────────────────────────────────────

    function getFactionSlug() {
        const parts = window.location.pathname.split('/').filter(Boolean);
        if (parts.length >= 2 && parts[0] === 'factions') return parts[1];
        return null;
    }

    function esc(str) {
        if (str === null || str === undefined) return '';
        const d = document.createElement('div');
        d.textContent = String(str);
        return d.innerHTML;
    }

    function capitalize(s) {
        if (!s) return '';
        return s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ');
    }

    function formatScope(scope) {
        return ({ single_run: 'Single Run', cumulative: 'Cumulative', multi_run: 'Multi-Run' })[scope] || capitalize(scope);
    }

    async function fetchJSON(url) {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`${res.status} ${url}`);
        return res.json();
    }

    // ─── Tabs ───────────────────────────────────────────────

    function setupTabs() {
        document.querySelectorAll('.fh-tab').forEach(btn => {
            btn.addEventListener('click', () => activateTab(btn.dataset.tab));
        });
        document.querySelectorAll('.fh-contract-filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.fh-contract-filter-btn').forEach(b => b.classList.toggle('active', b === btn));
                activeTypeFilter = btn.dataset.type || '';
                renderContractsList(allContracts);
            });
        });
    }

    function activateTab(tabName) {
        document.querySelectorAll('.fh-tab').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });
        ['overview', 'contracts', 'upgrades'].forEach(name => {
            const id    = 'fhTab' + name.charAt(0).toUpperCase() + name.slice(1);
            const panel = document.getElementById(id);
            if (panel) {
                panel.hidden = name !== tabName;
                panel.classList.toggle('active', name === tabName);
            }
        });
    }

    // ─── Contract Modal ─────────────────────────────────────

    function setupContractModal() {
        const overlay = document.getElementById('contractModal');
        const closeBtn = document.getElementById('contractModalClose');
        closeBtn?.addEventListener('click', closeContractModal);
        overlay?.addEventListener('click', e => {
            if (e.target === overlay || e.target.classList.contains('fhm-layout') || e.target.classList.contains('fhm-flank'))
                closeContractModal();
        });
        document.addEventListener('keydown', e => { if (e.key === 'Escape') closeContractModal(); });
        window.addEventListener('popstate', e => {
            if (e.state?.contractSlug) openContractModal(e.state.contractSlug, true);
            else closeContractModal(true);
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
        document.body.style.overflow = 'hidden';
        const body = document.getElementById('contractModalBody');
        if (body) body.innerHTML = '<div class="loading-spinner" style="margin:64px auto"></div>';
        if (!skipPush) history.pushState({ contractSlug: slug }, '', `?contract=${slug}`);
        try {
            const json = await fetchJSON(`${CONTRACTS_API}/api/contracts/${slug}`);
            renderContractModal(json.contract || json.data || json);
            // Push flanking + inline ads
            try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch {}
            try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch {}
            try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch {}
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
        document.body.style.overflow = '';
        if (!skipPush) history.pushState({}, '', window.location.pathname);
    }

    // ─── Contract Modal Rendering ──────────────────────────

    function renderContractModal(c) {
        const bodyEl = document.getElementById('contractModalBody');
        if (!bodyEl) return;

        // Header badges
        const badgeItems = [
            c.contract_type && `<span class="fh-contract-type ${c.contract_type}">${capitalize(c.contract_type)}</span>`,
            c.difficulty    && `<span class="fh-contract-diff ${c.difficulty}">${capitalize(c.difficulty)}</span>`,
            c.scope         && `<span class="fhm-badge">${formatScope(c.scope)}</span>`,
            c.map_slug && c.map_slug !== 'any-zone' && `<span class="fhm-badge">${capitalize(c.map_slug)}</span>`,
            c.is_repeatable && `<span class="fhm-badge">Repeatable</span>`,
            !c.is_active    && `<span class="fhm-badge" style="opacity:.5">Inactive</span>`,
        ].filter(Boolean);

        // Chain banner
        const chainHtml = (c.chain_slug && c.chain_position && c.chain_total) ? `
            <div class="fhm-chain">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                Part ${c.chain_position} of ${c.chain_total} in quest chain
            </div>` : '';

        // Meta chips
        const metaItems = [
            c.faction?.agent_name && metaChip(`<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>Agent: ${esc(c.faction.agent_name)}`),
            (c.estimated_time_range || c.estimated_time_minutes) && metaChip(`<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>${esc(c.estimated_time_range || ('~' + c.estimated_time_minutes + ' min'))}`),
            c.required_rank  && metaChip(`<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>Rank ${c.required_rank} required`),
            c.cooldown_hours && metaChip(`<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>${c.cooldown_hours}h cooldown`),
            c.total_reputation && metaChip(`<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>+${c.total_reputation} Rep`, 'fhm-rep'),
        ].filter(Boolean);
        const metaHtml = metaItems.length ? `<div class="fhm-meta">${metaItems.join('')}</div>` : '';

        // Tags
        const tagsHtml = (c.tags?.length)
            ? `<div class="fhm-tags">${c.tags.map(t => `<span class="fh-contract-tag" style="--tag-color:#888">${esc(typeof t === 'string' ? t : (t.name || t))}</span>`).join('')}</div>`
            : '';

        // Story / flavor
        const storyHtml = [
            c.flavor_text && `<p class="fhm-flavor">\u201c${esc(c.flavor_text)}\u201d</p>`,
            c.story_text  && `<p class="fhm-story">${esc(c.story_text)}</p>`,
        ].filter(Boolean).join('');

        // Objectives / Steps
        let stepsHtml = '';
        if (c.steps?.length) {
            const inner = c.steps.map(s => {
                const label = s.name || s.description || ('Step ' + s.step_number);
                const countBadge = s.count > 1 ? `<span class="fhm-step-count">\xd7${s.count}</span>` : '';
                const mapBadge   = s.map_slug && s.map_slug !== 'any-zone' ? `<span class="fhm-step-map">${capitalize(s.map_slug)}</span>` : '';
                const hintBadge  = s.location_hint ? `<span class="fhm-step-hint">${esc(s.location_hint)}</span>` : '';
                const wt = s.walkthrough ? `<div class="fhm-step-walkthrough">${esc(s.walkthrough)}</div>` : '';
                const rw = s.rewards?.length ? `<div class="fhm-step-rewards">${renderRewardPills(s.rewards)}</div>` : '';
                return `
                    <div class="fhm-step">
                        <div class="fhm-step-num">${s.step_number}</div>
                        <div class="fhm-step-content">
                            <div class="fhm-step-label">${esc(label)}${countBadge}${mapBadge}${hintBadge}</div>
                            ${wt}${rw}
                        </div>
                    </div>`;
            }).join('');
            stepsHtml = fhmSection(
                `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg> Objectives \u2014 ${c.steps.length} Step${c.steps.length !== 1 ? 's' : ''}`,
                `<div class="fhm-steps">${inner}</div>`
            );
        } else if (c.description) {
            stepsHtml = `<div class="fhm-section"><p class="fhm-desc">${esc(c.description)}</p></div>`;
        }

        // Completion rewards
        let rewardsHtml = '';
        if (c.completion_rewards?.length) {
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
        const tipsHtml = c.tips?.length ? fhmSection(
            `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg> Tips`,
            `<ul class="fhm-tips">${c.tips.map(t => '<li>' + esc(t) + '</li>').join('')}</ul>`
        ) : '';

        // Prerequisites
        const prereqHtml = c.prerequisites?.length ? fhmSection('Prerequisites',
            `<div class="fhm-prereqs">${c.prerequisites.map(p => '<span class="fhm-prereq">' + esc(p.name || p) + '</span>').join('')}</div>`
        ) : '';

        // Related
        let relatedHtml = '';
        if (c.related_contracts?.length) {
            const btns = c.related_contracts.slice(0, 4).map(r => `
                <button class="fhm-related-btn" data-slug="${esc(r.slug)}">
                    ${r.contract_type ? `<span class="fh-contract-type ${r.contract_type}" style="font-size:.6rem;padding:1px 5px">${capitalize(r.contract_type)}</span>` : ''}
                    ${esc(r.name)}
                </button>`).join('');
            relatedHtml = fhmSection(
                `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg> Related Contracts`,
                `<div class="fhm-related">${btns}</div>`
            );
        }

        // Mark complete button
        const completed = _currentUser && isContractCompleted(c.slug);
        const checkSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" width="16" height="16"><path d="M20 6L9 17l-5-5"/></svg>';
        const actionHtml = _currentUser ? `
            <div class="fhm-action">
                <button class="fhm-check${completed ? ' checked' : ''}" data-slug="${esc(c.slug)}">
                    <span class="fhc-check-box">${completed ? checkSvg : ''}</span>
                    <span class="fhm-check-label">${completed ? 'Completed' : 'Mark Complete'}</span>
                </button>
            </div>` : '';

        // Inline ad (shown when flanks hidden)
        const inlineAdHtml = `
            <div class="fhm-inline-ad">
            </div>`;

        bodyEl.innerHTML = `
            <div class="fhm-header">
                <div class="fhm-header-badges">${badgeItems.join('')}</div>
                <h2 class="fhm-name">${esc(c.name || 'Untitled')}</h2>
            </div>
            <div class="fhm-content">
                ${metaHtml}
                ${chainHtml}
                ${tagsHtml}
                ${storyHtml}
                ${stepsHtml}
                ${rewardsHtml}
                ${tipsHtml}
                ${prereqHtml}
                ${relatedHtml}
                ${actionHtml}
                ${inlineAdHtml}
            </div>
        `;

        bodyEl.querySelectorAll('.fhm-related-btn[data-slug]').forEach(btn => {
            btn.addEventListener('click', () => openContractModal(btn.dataset.slug));
        });

        // Wire mark complete button
        bodyEl.querySelector('.fhm-check')?.addEventListener('click', async () => {
            await toggleContractCompletion(c.slug);
            // Re-render modal with updated state
            try {
                const json = await fetchJSON(`${CONTRACTS_API}/api/contracts/${c.slug}`);
                renderContractModal(json.contract || json.data || json);
            } catch {}
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
            const icon  = r.icon_url
                ? `<img src="${esc(r.icon_url)}" alt="" width="14" height="14" style="object-fit:contain" onerror="this.style.display='none'">`
                : rewardTypeEmoji(r.reward_type);
            const label  = esc(r.display_name || capitalize(r.reward_type));
            const amount = r.amount > 1 ? ` \xd7${r.amount}` : '';
            const chance = !r.is_guaranteed && r.drop_chance ? ` (${Math.round(r.drop_chance * 100)}%)` : '';
            const rar    = r.rarity ? ` <span class="fhm-reward-rarity">${capitalize(r.rarity)}</span>` : '';
            return `<span class="fhm-reward-pill ${r.reward_type || ''}">${icon}${label}${amount}${chance}${rar}</span>`;
        }).join('');
    }

    function rewardTypeEmoji(type) {
        return ({ credits: '💰', reputation: '⭐', salvage: '🔩', weapon: '🔫',
                  weapon_mod: '🔧', cosmetic: '✨', upgrade_token: '🎫',
                  faction_token: '🏷️', item: '📦' })[type] || '📦';
    }

    // ─── Weapon Skins Fetch ────────────────────────────────

    async function fetchFactionSkins(slug) {
        try {
            // Fetch all skins (paginated) and filter by faction
            const allSkins = [];
            let page = 1;
            let hasMore = true;
            while (hasMore) {
                const res = await fetch(`${SKINS_API}/api/skins?page=${page}&per_page=100`);
                if (!res.ok) break;
                const json = await res.json();
                const data = json.data || [];
                allSkins.push(...data);
                hasMore = page < (json.total_pages || 1);
                page++;
            }
            return allSkins.filter(s => s.faction?.slug === slug);
        } catch (err) {
            console.warn('Could not load faction skins:', err);
            return [];
        }
    }

    // ─── Reputation Methods ────────────────────────────────

    function renderRepMethods(methods) {
        const container = document.getElementById('fhRepMethods');
        if (!container) return;

        if (!methods.length) {
            container.closest('.fh-panel')?.style.setProperty('display', 'none');
            return;
        }

        container.innerHTML = methods.map(m =>
            `<div class="fh-rep-pill">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                ${esc(m)}
            </div>`
        ).join('');
    }

    // ─── Agent Info ────────────────────────────────────────

    function renderAgentInfo(data) {
        const el = document.getElementById('fhAgentDesc');
        if (el && data.agent_description) {
            el.textContent = data.agent_description;
        }
    }

    // ─── Contracts List (Contracts Tab) ───────────────────

    function renderContractsList(contracts) {
        const el = document.getElementById('fhContractsList');
        if (!el) return;

        const signinHtml = _currentUser ? '' : `
            <div class="fhu-signin-notice">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>
                <span><a href="/auth/create-account/">Sign in</a> to track your progress and check off completed contracts.</span>
            </div>`;

        const filtered = activeTypeFilter ? contracts.filter(c => c.contract_type === activeTypeFilter) : contracts;
        if (!filtered.length) {
            el.innerHTML = `
                <div class="fh-empty-state">
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6"/></svg>
                    <p>${activeTypeFilter ? 'No ' + capitalize(activeTypeFilter) + ' contracts available.' : 'No contracts available yet.'}</p>
                </div>`;
            return;
        }
        el.innerHTML = signinHtml + filtered.map(renderContractRow).join('');
        el.querySelectorAll('.fh-contract-row').forEach(row => {
            row.addEventListener('click', e => {
                if (e.target.closest('.fhc-check')) return;
                openContractModal(row.dataset.slug);
            });
            row.addEventListener('keydown', e => {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openContractModal(row.dataset.slug); }
            });
        });
        if (_currentUser) {
            el.querySelectorAll('.fhc-check').forEach(btn => {
                btn.addEventListener('click', e => {
                    e.stopPropagation();
                    toggleContractCompletion(btn.dataset.slug);
                });
            });
        }
    }

    function renderContractRow(c) {
        const name     = esc(c.name || 'Untitled');
        const type     = c.contract_type || '';
        const diff     = c.difficulty    || '';
        const totalRep = c.reward_preview?.total_reputation || c.total_reputation || 0;
        const tags     = (c.tags || []).slice(0, 3);
        const tagHtml  = tags.map(t => {
            const label = typeof t === 'string' ? t : (t.name || '');
            const color = typeof t === 'string' ? '#888' : (t.color || '#888');
            return `<span class="fh-contract-tag" style="--tag-color:${color}">${esc(label)}</span>`;
        }).join('');

        const metaParts = [
            c.map_slug && c.map_slug !== 'any-zone' && `<span class="fh-contract-meta-item"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg> ${capitalize(c.map_slug)}</span>`,
            (c.estimated_time_range || c.estimated_time_minutes) && `<span class="fh-contract-meta-item">\u23f1 ${esc(c.estimated_time_range || ('~' + c.estimated_time_minutes + ' min'))}</span>`,
        ].filter(Boolean).join('');

        const completed = isContractCompleted(c.slug);
        const checkSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" width="14" height="14"><path d="M20 6L9 17l-5-5"/></svg>';
        const checkHtml = _currentUser ? `
            <button class="fhc-check${completed ? ' checked' : ''}" data-slug="${esc(c.slug)}" aria-label="${completed ? 'Completed' : 'Mark complete'}">
                <span class="fhc-check-box">${completed ? checkSvg : ''}</span>
            </button>` : '';

        return `
            <div class="fh-contract-row${completed ? ' fh-contract-row--done' : ''}" data-slug="${esc(c.slug)}" role="button" tabindex="0" aria-label="View contract: ${name}">
                ${checkHtml}
                <div class="fh-contract-row-main">
                    <div class="fh-contract-row-badges">
                        ${type ? `<span class="fh-contract-type ${type}">${capitalize(type)}</span>` : ''}
                        ${diff ? `<span class="fh-contract-diff ${diff}">${capitalize(diff)}</span>` : ''}
                    </div>
                    <div class="fh-contract-row-name">${name}</div>
                    ${c.description ? `<div class="fh-contract-row-desc">${esc(c.description)}</div>` : ''}
                    <div class="fh-contract-row-footer">
                        ${metaParts ? `<div class="fh-contract-row-meta">${metaParts}</div>` : ''}
                        ${tagHtml   ? `<div class="fh-contract-row-tags">${tagHtml}</div>` : ''}
                    </div>
                </div>
                <div class="fh-contract-row-rep">
                    ${totalRep ? `<span class="fh-contract-rep-badge">+${totalRep} Rep</span>` : ''}
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
                </div>
            </div>`;
    }

    // ─── Items Data ──────────────────────────────────────────

    async function fetchItemsData() {
        if (_fhuItemsCache) return _fhuItemsCache;
        try {
            const res = await fetch(`${ITEMS_API}/api/items`);
            if (res.ok) {
                const j = await res.json();
                if (j.success && j.data) {
                    _fhuItemsCache = {};
                    for (const item of j.data) _fhuItemsCache[item.slug] = item;
                    return _fhuItemsCache;
                }
            }
        } catch {}
        _fhuItemsCache = {};
        return _fhuItemsCache;
    }

    // ─── Upgrades Card System ─────────────────────────────────

    function renderUpgradesOverview() {
        const el = document.getElementById('fhUpgradesOverview');
        if (!el) return;
        const def = window.FACTION_UPGRADES?.[factionSlug];
        if (!def || !def.upgrades?.length) {
            el.innerHTML = '<p class="fh-empty-note">Upgrade data coming soon.</p>';
            return;
        }
        _fhuCatFilter = 'all';

        const signinHtml = _currentUser ? '' : `
            <div class="fhu-signin-notice">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>
                <span><a href="/auth/create-account/">Sign in</a> to track your progress.</span>
            </div>`;

        el.innerHTML = `
            ${signinHtml}
            <div id="fhuCatFilter" class="fhu-cat-filter"></div>
            <div id="fhuCardsGrid" class="fhu-cards-grid"></div>
            <div id="fhuCapstones" class="fhu-capstones"></div>`;
        renderFhuCatFilter(def);
        renderFhuCards(def);
        renderFhuCapstones(def);
    }

    function renderFhuCatFilter(def) {
        const el = document.getElementById('fhuCatFilter');
        if (!el) return;
        const cats = [...new Set(def.upgrades.map(u => u.category))];
        el.innerHTML = `
            <button class="fhu-cat-btn${_fhuCatFilter === 'all' ? ' active' : ''}" data-cat="all">All</button>
            ${cats.map(c => `<button class="fhu-cat-btn${_fhuCatFilter === c ? ' active' : ''}" data-cat="${c}">${FHU_CAT_LABELS[c] || c}</button>`).join('')}`;
        el.querySelectorAll('.fhu-cat-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                _fhuCatFilter = btn.dataset.cat;
                el.querySelectorAll('.fhu-cat-btn').forEach(b => b.classList.toggle('active', b === btn));
                renderFhuCards(def);
            });
        });
    }

    function renderFhuCards(def) {
        const el = document.getElementById('fhuCardsGrid');
        if (!el) return;
        const upgrades = _fhuCatFilter === 'all' ? def.upgrades : def.upgrades.filter(u => u.category === _fhuCatFilter);
        const sorted = [...upgrades].sort((a, b) => {
            const ra = typeof a.levels[0]?.rank === 'number' ? a.levels[0].rank : 9999;
            const rb = typeof b.levels[0]?.rank === 'number' ? b.levels[0].rank : 9999;
            return ra - rb;
        });
        el.innerHTML = sorted.map(u => renderFhuCard(u, def)).join('');
        el.querySelectorAll('.fhu-card').forEach(card => {
            card.addEventListener('click', (e) => {
                if (e.target.closest('.fhc-check')) return;
                const slug = card.dataset.slug;
                const upgrade = def.upgrades.find(u => u.slug === slug);
                if (upgrade) openFhuUpgradeModal(upgrade, def);
            });
        });
        // Wire single-level upgrade card checkboxes
        el.querySelectorAll('.fhu-card .fhc-check').forEach(btn => {
            btn.addEventListener('click', e => {
                e.stopPropagation();
                const slug = btn.dataset.slug;
                const level = parseInt(btn.dataset.level, 10);
                toggleUpgradeCompletion(slug, level);
            });
        });
    }

    function renderFhuCard(u, def) {
        const isMulti = u.maxLevel > 1;
        const firstLv = u.levels[0];
        const uniqueRanks = [...new Set(u.levels.map(lv => lv.rank))];
        const rankDisplay = uniqueRanks.map(r => typeof r === 'string' ? r : `Rank ${r}`).join(' \xb7 ');

        // Completion state
        const completedLevels = _currentUser ? u.levels.filter(lv => isUpgradeLevelUnlocked(u.slug, lv.level)).length : 0;
        const isFullyComplete = completedLevels === u.levels.length;
        const isPartial = completedLevels > 0 && !isFullyComplete;
        const cardClass = isFullyComplete ? ' fhu-card--done' : (isPartial ? ' fhu-card--partial' : '');

        let pipsHtml = '';
        if (isMulti) {
            pipsHtml = `<div class="fhu-card-pips">${u.levels.map(lv =>
                `<span class="fhu-card-pip${isUpgradeLevelUnlocked(u.slug, lv.level) ? ' filled' : ''}"></span>`
            ).join('')}</div>`;
        }

        // Simple check for single-level upgrades
        const checkSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" width="14" height="14"><path d="M20 6L9 17l-5-5"/></svg>';
        const checkHtml = (_currentUser && !isMulti) ? `
            <button class="fhc-check${isFullyComplete ? ' checked' : ''}" data-slug="${u.slug}" data-level="${firstLv.level}" aria-label="${isFullyComplete ? 'Completed' : 'Mark complete'}">
                <span class="fhc-check-box">${isFullyComplete ? checkSvg : ''}</span>
            </button>` : '';

        const descText = isMulti ? u.description : (firstLv.effect || u.description);

        const salvageHtml = firstLv.salvage.length ? `<span class="fhu-card-salvage">${firstLv.salvage.slice(0, 3).map(s => {
            const mat = def.materials.find(m => m.slug === s.slug);
            const itemData = _fhuItemsCache?.[s.slug];
            const imgUrl = itemData?.image_url ? `${ITEMS_API}${itemData.image_url}` : `${ITEMS_API}/images/items/${s.slug}.webp`;
            return `<img src="${imgUrl}" alt="${mat?.name || ''}" title="${mat?.name || s.slug} \xd7${s.amount}" width="18" height="18">`;
        }).join('')}</span>` : '';

        return `<div class="fhu-card${cardClass}" data-slug="${u.slug}">
            <div class="fhu-card-header">
                <span class="fhu-card-cat">${FHU_CAT_LABELS[u.category] || u.category}</span>
                ${checkHtml}
                ${pipsHtml}
            </div>
            <div class="fhu-card-name">${esc(u.name)}</div>
            <div class="fhu-card-desc">${descText ? esc(descText) : ''}</div>
            <div class="fhu-card-meta">
                <span class="fhu-card-rank">${rankDisplay}</span>
                ${isMulti ? `<span class="fhu-card-lvl">${completedLevels}/${u.levels.length} levels</span>` : ''}
                ${!isMulti && firstLv.credits ? `<span class="fhu-card-credits"><img src="/assets/icons/credits.webp" alt="" width="14" height="14">${firstLv.credits.toLocaleString()}</span>` : ''}
                ${salvageHtml}
            </div>
            <div class="fhu-card-cta">Click for full details</div>
        </div>`;
    }

    // ─── Capstones ────────────────────────────────────────────

    function renderFhuCapstones(def) {
        const el = document.getElementById('fhuCapstones');
        if (!el || !def.capstones?.length) return;
        const checkSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" width="14" height="14"><path d="M20 6L9 17l-5-5"/></svg>';
        el.innerHTML = `
            <div class="fhu-capstones-section">
                <div class="fhu-capstones-header">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                    Capstones
                </div>
                <div class="fhu-capstones-grid">
                    ${def.capstones.map(c => {
                        const done = _currentUser && isCapstoneUnlocked(c.rank);
                        return `
                    <div class="fhu-capstone${done ? ' fhu-capstone--done' : ''}">
                        <div class="fhu-capstone-left">
                            <div class="fhu-capstone-circle">
                                <span class="fhu-capstone-num">${c.rank}</span>
                            </div>
                        </div>
                        <div class="fhu-capstone-body">
                            <div class="fhu-capstone-name">${esc(c.name)}</div>
                            <div class="fhu-capstone-meta">
                                <span class="fhu-capstone-req">${c.nodesRequired} upgrades required</span>
                                ${c.reward ? `<span class="fhu-capstone-reward">${esc(c.reward)}</span>` : ''}
                            </div>
                        </div>
                        ${_currentUser ? `<button class="fhc-check fhu-capstone-check${done ? ' checked' : ''}" data-rank="${c.rank}" aria-label="${done ? 'Completed' : 'Mark complete'}"><span class="fhc-check-box">${done ? checkSvg : ''}</span></button>` : ''}
                    </div>`;
                    }).join('')}
                </div>
            </div>`;
        // Wire capstone checkboxes
        el.querySelectorAll('.fhu-capstone-check').forEach(btn => {
            btn.addEventListener('click', e => {
                e.stopPropagation();
                const rank = parseInt(btn.dataset.rank, 10);
                toggleCapstoneCompletion(rank);
            });
        });
    }

    // ─── Upgrade Detail Modal ─────────────────────────────────

    function setupUpgradeModal() {
        const overlay = document.getElementById('fhuModal');
        const closeBtn = document.getElementById('fhuModalClose');
        closeBtn?.addEventListener('click', closeFhuUpgradeModal);
        overlay?.addEventListener('click', e => {
            if (e.target === overlay || e.target.classList.contains('fhu-modal-layout') || e.target.classList.contains('fhu-modal-flank'))
                closeFhuUpgradeModal();
        });
        document.addEventListener('keydown', e => {
            if (e.key === 'Escape') {
                const modal = document.getElementById('fhuModal');
                if (modal && !modal.hidden) closeFhuUpgradeModal();
            }
        });
    }

    async function openFhuUpgradeModal(u, def) {
        const overlay = document.getElementById('fhuModal');
        const body = document.getElementById('fhuModalBody');
        if (!overlay || !body) return;
        overlay.hidden = false;
        document.body.style.overflow = 'hidden';
        const items = await fetchItemsData();
        body.innerHTML = `
            <div class="fhu-modal-header">
                <span class="fhu-modal-cat">${FHU_CAT_LABELS[u.category] || u.category}</span>
                <h2 class="fhu-modal-title">${esc(u.name)}</h2>
                ${u.description ? `<p class="fhu-modal-desc">${esc(u.description)}</p>` : ''}
            </div>
            <div class="fhu-modal-levels">
                ${u.levels.map(lv => renderFhuModalLevel(u, lv, def, items)).join('')}
            </div>
            <div class="fhu-modal-inline-ad">
            </div>`;
        // Push ads: flanking (left + right) + inline fallback
        try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch {}
        try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch {}
        try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch {}

        // Wire upgrade-level checkboxes in modal
        body.querySelectorAll('.fhu-modal-lv-check').forEach(btn => {
            btn.addEventListener('click', e => {
                e.stopPropagation();
                const slug = btn.dataset.slug;
                const level = parseInt(btn.dataset.level, 10);
                toggleUpgradeCompletion(slug, level);
            });
        });
    }

    function renderFhuModalLevel(u, lv, def, items) {
        const isMulti = u.maxLevel > 1;
        const completed = _currentUser && isUpgradeLevelUnlocked(u.slug, lv.level);
        const checkSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" width="14" height="14"><path d="M20 6L9 17l-5-5"/></svg>';
        const checkHtml = _currentUser ? `
            <button class="fhu-modal-lv-check${completed ? ' checked' : ''}" data-slug="${u.slug}" data-level="${lv.level}" aria-label="${completed ? 'Completed' : 'Mark complete'}">
                <span class="fhc-check-box">${completed ? checkSvg : ''}</span>
            </button>` : '';

        const salvageHtml = lv.salvage.map(s => {
            const mat = def.materials.find(m => m.slug === s.slug);
            const itemData = items[s.slug];
            const imgUrl = itemData?.image_url ? `${ITEMS_API}${itemData.image_url}` : (mat?.icon || '');
            const desc = itemData?.description || '';
            const acqNote = itemData?.acquisition_note || '';
            const locations = itemData?.known_locations || [];
            return `<div class="fhu-modal-mat">
                <img class="fhu-modal-mat-img" src="${imgUrl}" alt="" width="40" height="40">
                <div class="fhu-modal-mat-info">
                    <div class="fhu-modal-mat-name">${esc(mat?.name || s.slug)} <span class="fhu-modal-mat-qty">\xd7${s.amount}</span></div>
                    ${desc ? `<div class="fhu-modal-mat-desc">${esc(desc.split('\n')[0])}</div>` : ''}
                    ${locations.length ? `<div class="fhu-modal-mat-locs">${locations.map(l => `<span>${esc(l)}</span>`).join('')}</div>` : ''}
                    ${acqNote ? `<div class="fhu-modal-mat-acq">${esc(acqNote)}</div>` : ''}
                </div>
            </div>`;
        }).join('');

        return `<div class="fhu-modal-lv${completed ? ' fhu-modal-lv--done' : ''}">
            <div class="fhu-modal-lv-header">
                <div class="fhu-modal-lv-left">
                    ${isMulti ? `<span class="fhu-modal-lv-num">Level ${lv.level}</span>` : ''}
                    <span class="fhu-modal-lv-rank${typeof lv.rank === 'string' ? ' vip' : ''}">Rank ${lv.rank}</span>
                </div>
                ${checkHtml}
            </div>
            ${lv.effect ? `<div class="fhu-modal-lv-effect">${esc(lv.effect)}</div>` : ''}
            <div class="fhu-modal-lv-cost">
                <span class="fhu-modal-lv-credits"><img src="/assets/icons/credits.webp" alt="" width="14" height="14">${lv.credits.toLocaleString()} Credits</span>
            </div>
            ${lv.salvage.length ? `<div class="fhu-modal-lv-label">Required Materials</div><div class="fhu-modal-mats">${salvageHtml}</div>` : ''}
        </div>`;
    }

    function closeFhuUpgradeModal() {
        const modal = document.getElementById('fhuModal');
        if (modal) modal.hidden = true;
        document.body.style.overflow = '';
    }

    // ─── Cosmetics (Weapon Skins) ──────────────────────────

    function renderCosmetics(skins) {
        const el = document.getElementById('fhCosmeticsGrid');
        if (!el) return;
        if (!skins.length) {
            el.innerHTML = `<div class="fh-empty-state"><p>No faction cosmetics found yet.</p></div>`;
            return;
        }
        el.innerHTML = skins.map(s => {
            const name     = esc(s.display_name || s.name || 'Unknown');
            const weapon   = esc(s.weapon?.name || '');
            const rarity   = s.rarity || '';
            const slug     = s.slug || '';
            const rawThumb = s.image?.card || s.image?.thumbnail || '';
            const imageUrl = rawThumb
                ? (rawThumb.startsWith('http') ? rawThumb : `${SKINS_API}/${rawThumb}`)
                : `${SKINS_API}/assets/weapon-skins/${slug}/card.webp`;
            return `
                <a href="/weapon-skins/?skin=${slug}" class="fh-skin-card ${rarity}" title="${name}">
                    <div class="fh-skin-img">
                        <img src="${imageUrl}" alt="${name}" loading="lazy" onerror="this.style.display='none'">
                    </div>
                    <div class="fh-skin-info">
                        <span class="fh-skin-name">${name}</span>
                        ${weapon ? `<span class="fh-skin-weapon">${weapon}</span>` : ''}
                    </div>
                    ${rarity ? `<span class="fh-skin-rarity ${rarity}">${capitalize(rarity)}</span>` : ''}
                </a>`;
        }).join('');
    }

    // ─── Count Badges ──────────────────────────────────────

    function updateCounts(contractCount, skinsCount) {
        setCt('fhContractsTabCount', contractCount);
        setCt('fhContractsCount',    contractCount);
        setCt('fhCosmeticsCount',    skinsCount);
    }

    function setCt(id, count) {
        const el = document.getElementById(id);
        if (el) { el.textContent = count; el.style.display = count > 0 ? '' : 'none'; }
    }

    // Expose for related-contract inline buttons
    window.openContractModal = openContractModal;

})();

