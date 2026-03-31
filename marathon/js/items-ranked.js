// Ranked Rewards Items Page JavaScript
// Only shows items where is_ranked_reward === true, with rank badges on cards.
// API: https://items.marathondb.gg

const ITEMS_API = 'https://items.marathondb.gg';

let allItems = [];
let filteredItems = [];
let currentSort = 'rank';
let currentItemSlug = null;

// ─── Constants ───────────────────────────────────────────────

const RARITY_ORDER = { contraband: 6, prestige: 5, superior: 4, deluxe: 3, enhanced: 2, standard: 1 };

const RARITY_LABELS = {
    standard:   'Standard',
    enhanced:   'Enhanced',
    deluxe:     'Deluxe',
    superior:   'Superior',
    prestige:   'Prestige',
    contraband: 'Contraband',
};

const RANK_ORDER = { Pinnacle: 6, Diamond: 5, Platinum: 4, Gold: 3, Silver: 2, Bronze: 1 };

// ─── Initialisation ──────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async function () {
    await loadItems();

    // Rank filter pills
    document.getElementById('rankFilterPills')?.addEventListener('click', (e) => {
        const pill = e.target.closest('.filter-pill-sm[data-rank]');
        if (!pill) return;
        document.querySelectorAll('#rankFilterPills .filter-pill-sm').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        filterAndSortItems();
    });

    const itemsGrid = document.getElementById('itemsGrid');
    if (itemsGrid) {
        itemsGrid.addEventListener('click', handleGridClick);
        itemsGrid.addEventListener('keydown', handleGridKeydown);
    }

    // Modal close
    document.getElementById('itemModalBackdrop')?.addEventListener('click', closeItemModal);
    document.getElementById('itemModalClose')?.addEventListener('click', closeItemModal);
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeItemModal();
    });

    // Browser back/forward
    window.addEventListener('popstate', (e) => {
        if (e.state && e.state.itemSlug) {
            openItemModal(e.state.itemSlug, true);
        } else {
            closeItemModal(true);
        }
    });

    // Check for ?item= on load
    const params = new URLSearchParams(window.location.search);
    const itemParam = params.get('item');
    if (itemParam) {
        openItemModal(itemParam, true);
    }
});

// ─── Data Loading ─────────────────────────────────────────────

async function loadItems() {
    try {
        const itemsRes = await fetch(`${ITEMS_API}/api/items/ranked`).then(r => r.json());

        if (!itemsRes.success || !Array.isArray(itemsRes.data)) {
            showError('Failed to load ranked rewards. Please try again later.');
            return;
        }

        allItems = itemsRes.data;
        filteredItems = [...allItems];

        filterAndSortItems();
        updateCount();
        injectStructuredData(allItems);
    } catch (err) {
        console.error('Items load error:', err);
        showError('Could not connect to the items database. Please try again later.');
    }
}

// ─── SEO Structured Data ──────────────────────────────────────

function injectStructuredData(items) {
    if (!items || !items.length) return;

    const baseUrl = 'https://marathondb.gg/items/ranked-rewards/';

    const itemList = {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        'name': 'Marathon Ranked Reward Items',
        'description': 'Every ranked reward item in Marathon — exclusive items earned through competitive play.',
        'url': baseUrl,
        'numberOfItems': items.length,
        'itemListElement': items.map((item, i) => {
            const entry = {
                '@type': 'ListItem',
                'position': i + 1,
                'name': item.name,
                'url': baseUrl + '?item=' + encodeURIComponent(item.slug)
            };
            if (item.description) entry.description = item.description;
            return entry;
        })
    };

    const faqEntries = [];
    for (const item of items) {
        const name = item.name;
        const ranks = Array.isArray(item.ranked_ranks) ? item.ranked_ranks : tryParseJSON(item.ranked_ranks) || [];

        const parts = [];
        if (ranks.length > 0) {
            parts.push(`${name} is a ranked reward unlocked at: ${ranks.join(', ')}.`);
        }
        if (item.acquisition_note) {
            parts.push(item.acquisition_note);
        }

        const answer = parts.length > 0
            ? parts.join(' ')
            : `${name} is a ranked reward item earned through competitive play in Marathon.`;

        faqEntries.push({
            '@type': 'Question',
            'name': `How to unlock ${name} in Marathon ranked`,
            'acceptedAnswer': { '@type': 'Answer', 'text': answer }
        });
    }

    const faqSchema = {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        'mainEntity': faqEntries
    };

    const injectScript = (data) => {
        const el = document.createElement('script');
        el.type = 'application/ld+json';
        el.textContent = JSON.stringify(data);
        document.head.appendChild(el);
    };
    injectScript(itemList);
    if (faqEntries.length) injectScript(faqSchema);
}

// ─── Filter, Sort, Display ────────────────────────────────────

function filterAndSortItems() {
    const activeRank = document.querySelector('#rankFilterPills .filter-pill-sm.active')?.dataset.rank || '';

    filteredItems = allItems.filter(item => {
        if (activeRank) {
            const ranks = Array.isArray(item.ranked_ranks) ? item.ranked_ranks : tryParseJSON(item.ranked_ranks) || [];
            if (!ranks.includes(activeRank)) return false;
        }
        return true;
    });

    sortItems();
    displayItems(filteredItems);
    updateCount();
}

function sortItems() {
    filteredItems.sort((a, b) => {
        // Sort by highest rank: Pinnacle > Diamond > Platinum > Gold > Silver > Bronze
        const ranksA = Array.isArray(a.ranked_ranks) ? a.ranked_ranks : tryParseJSON(a.ranked_ranks) || [];
        const ranksB = Array.isArray(b.ranked_ranks) ? b.ranked_ranks : tryParseJSON(b.ranked_ranks) || [];
        const maxRankA = Math.max(0, ...ranksA.map(r => RANK_ORDER[r] || 0));
        const maxRankB = Math.max(0, ...ranksB.map(r => RANK_ORDER[r] || 0));
        if (maxRankB !== maxRankA) return maxRankB - maxRankA;
        // Tie-break by rarity then name
        const rarDiff = (RARITY_ORDER[(b.rarity || 'standard')] || 0) - (RARITY_ORDER[(a.rarity || 'standard')] || 0);
        if (rarDiff !== 0) return rarDiff;
        return (a.name || '').localeCompare(b.name || '');
    });
}

function updateCount() {
    const el = document.getElementById('itemCount');
    if (el) el.textContent = `(${filteredItems.length})`;
}

function displayItems(items) {
    const grid = document.getElementById('itemsGrid');
    const empty = document.getElementById('emptyState');
    if (!grid) return;

    if (!items || items.length === 0) {
        grid.style.display = 'none';
        if (empty) empty.style.display = '';
        return;
    }

    grid.style.display = '';
    if (empty) empty.style.display = 'none';

    grid.innerHTML = items.map(item => {
        const rarity = (item.rarity || 'standard').toLowerCase();
        const type = item.item_type || 'Item';
        const imgSrc = item.image_url ? `${ITEMS_API}${item.image_url}` : '';

        const ranks = Array.isArray(item.ranked_ranks) ? item.ranked_ranks : tryParseJSON(item.ranked_ranks) || [];
        const rankBadges = ranks
            .sort((a, b) => (RANK_ORDER[b] || 0) - (RANK_ORDER[a] || 0))
            .map(r => `<span class="ranked-rank-pill ranked-rank-pill--${escapeAttr(r.toLowerCase())}">${escapeHtml(r)}</span>`)
            .join('');

        return `
            <div class="core-card ${rarity}" data-slug="${escapeAttr(item.slug)}" role="button" tabindex="0">
                <div class="core-card-glow"></div>
                <div class="core-card-header">
                    <span class="item-type-pill">${escapeHtml(type)}</span>
                </div>
                <div class="core-icon-container">
                    <div class="core-icon ${rarity}">
                        ${imgSrc
                            ? `<img src="${escapeAttr(imgSrc)}" alt="${escapeAttr(item.name)} – Marathon ranked reward" onerror="this.parentElement.classList.add('icon-fallback')" loading="lazy">`
                            : `<span class="item-icon-placeholder">${escapeHtml(type.charAt(0))}</span>`
                        }
                    </div>
                </div>
                <div class="core-card-content">
                    <div class="core-name">${escapeHtml(item.name || 'Unknown')}</div>
                    ${item.description ? `<div class="core-description-snippet">${escapeHtml(item.description)}</div>` : ''}
                    ${rankBadges ? `<div class="rr-emblem-ranks" style="justify-content:center;margin-top:4px">${rankBadges}</div>` : ''}
                </div>
                <div class="core-card-footer">
                    <span class="core-card-cta">View Details <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg></span>
                </div>
            </div>
        `;
    }).join('');
}

function handleGridClick(e) {
    const card = e.target.closest('.core-card[data-slug]');
    if (card) openItemModal(card.dataset.slug);
}

function handleGridKeydown(e) {
    if (e.key === 'Enter' || e.key === ' ') {
        const card = e.target.closest('.core-card[data-slug]');
        if (card) { e.preventDefault(); openItemModal(card.dataset.slug); }
    }
}

// ─── Modal: Open / Close / Render ────────────────────────────

async function openItemModal(slug, skipPush) {
    if (!slug) return;
    currentItemSlug = slug;

    const overlay = document.getElementById('itemModal');
    if (!overlay) return;

    overlay.classList.add('active');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');

    if (!overlay._adsPushed) {
        overlay._adsPushed = true;
        setTimeout(() => {
            overlay.querySelectorAll('ins.adsbygoogle').forEach(() => {
                try { (adsbygoogle = window.adsbygoogle || []).push({}); } catch (e) {}
            });
        }, 300);
    }

    // Loading state
    document.getElementById('itemModalName').textContent = 'Loading...';
    document.getElementById('itemModalDescription').textContent = '';
    document.getElementById('itemModalBadges').innerHTML = '';
    document.getElementById('itemModalQuickStats').innerHTML = '';
    document.getElementById('itemModalLocations').innerHTML = '';
    document.getElementById('itemModalIcon').src = '';
    hideAllModalSections();

    if (!skipPush) {
        const url = new URL(window.location);
        url.searchParams.set('item', slug);
        history.pushState({ itemSlug: slug }, '', url);
    }

    try {
        const res = await fetch(`${ITEMS_API}/api/items/${encodeURIComponent(slug)}`);
        if (!res.ok) {
            document.getElementById('itemModalName').textContent = 'Item not found';
            return;
        }
        const json = await res.json();
        if (!json.success || !json.data) {
            document.getElementById('itemModalName').textContent = 'Item not found';
            return;
        }
        renderItemModal(json.data);
    } catch (err) {
        console.error('Failed to load item detail:', err);
        document.getElementById('itemModalName').textContent = 'Error loading item';
    }
}

function closeItemModal(skipPush) {
    const overlay = document.getElementById('itemModal');
    if (!overlay || !overlay.classList.contains('active')) return;

    overlay.classList.remove('active');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
    currentItemSlug = null;

    if (skipPush !== true) {
        const url = new URL(window.location);
        url.searchParams.delete('item');
        history.pushState({}, '', url.pathname + (url.search || ''));
    }
}

function hideAllModalSections() {
    ['itemModalRankedSection', 'itemModalLocationsSection', 'itemModalAcqSection', 'itemModalPurchaseSection'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });
}

function renderItemModal(item) {
    const rarity = (item.rarity || 'standard').toLowerCase();
    const type = item.item_type || 'Item';
    const imgSrc = item.image_url ? `${ITEMS_API}${item.image_url}` : '';

    // Icon
    const iconImg = document.getElementById('itemModalIcon');
    if (imgSrc) {
        iconImg.src = imgSrc;
        iconImg.alt = item.name || '';
        iconImg.style.display = '';
    } else {
        iconImg.src = '';
        iconImg.style.display = 'none';
    }

    const iconFrame = document.getElementById('itemModalIconFrame');
    iconFrame.className = 'core-modal-icon-frame ' + rarity;

    const glow = document.getElementById('itemModalRarityGlow');
    glow.className = 'core-modal-rarity-glow ' + rarity;

    // Placeholder letter when no image
    const placeholder = document.getElementById('itemModalIconPlaceholder');
    if (placeholder) {
        placeholder.textContent = imgSrc ? '' : type.charAt(0);
        placeholder.style.display = imgSrc ? 'none' : '';
    }

    // Name
    document.getElementById('itemModalName').textContent = item.name || 'Unknown Item';

    // Description
    document.getElementById('itemModalDescription').textContent = item.description || '';

    // Badges
    const verifiedBadge = item.verified
        ? `<span class="cd-badge cd-badge-verified">
               <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
               Verified
           </span>`
        : '';
    const rankedBadge = item.is_ranked_reward
        ? `<span class="cd-badge cd-badge-ranked">
               <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5C7 4 7 7 7 7"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5C17 4 17 7 17 7"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>
               Ranked Reward
           </span>`
        : '';
    document.getElementById('itemModalBadges').innerHTML = `
        <span class="cd-badge cd-badge-type">${escapeHtml(type)}</span>
        <span class="cd-badge cd-badge-rarity ${rarity}">${escapeHtml(RARITY_LABELS[rarity] || rarity)}</span>
        ${verifiedBadge}
        ${rankedBadge}
    `;

    // Quick stats
    const stats = [];
    if (item.value != null) {
        stats.push(`<div class="core-modal-qs"><span class="core-modal-qs-label">Value</span><span class="core-modal-qs-value">${Number(item.value).toLocaleString()}</span></div>`);
    }
    stats.push(`<div class="core-modal-qs"><span class="core-modal-qs-label">Type</span><span class="core-modal-qs-value">${escapeHtml(type)}</span></div>`);
    stats.push(`<div class="core-modal-qs"><span class="core-modal-qs-label">Rarity</span><span class="core-modal-qs-value">${escapeHtml(RARITY_LABELS[rarity] || rarity)}</span></div>`);
    document.getElementById('itemModalQuickStats').innerHTML = stats.join('');

    // Ranked ranks
    const rankedSection = document.getElementById('itemModalRankedSection');
    const rankedEl = document.getElementById('itemModalRankedRanks');
    const ranks = Array.isArray(item.ranked_ranks) ? item.ranked_ranks : tryParseJSON(item.ranked_ranks) || [];
    if (rankedSection && rankedEl && ranks.length > 0) {
        rankedEl.innerHTML = ranks
            .sort((a, b) => (RANK_ORDER[a] || 0) - (RANK_ORDER[b] || 0))
            .map(rank =>
                `<div class="ranked-rank-row">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5C7 4 7 7 7 7"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5C17 4 17 7 17 7"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>
                    <span class="ranked-rank-pill ranked-rank-pill--${escapeAttr(rank.toLowerCase())}">${escapeHtml(rank)}</span>
                </div>`
            ).join('');
        rankedSection.style.display = '';
    } else if (rankedSection) {
        rankedSection.style.display = 'none';
    }

    // Acquisition note
    const acqSection = document.getElementById('itemModalAcqSection');
    const acqEl = document.getElementById('itemModalAcqNote');
    if (item.acquisition_note && acqSection && acqEl) {
        acqEl.textContent = item.acquisition_note;
        acqSection.style.display = '';
    } else if (acqSection) {
        acqSection.style.display = 'none';
    }

    // Known locations
    const locSection = document.getElementById('itemModalLocationsSection');
    const locEl = document.getElementById('itemModalLocations');
    const locations = Array.isArray(item.known_locations) ? item.known_locations : tryParseJSON(item.known_locations);
    if (locSection && locEl && Array.isArray(locations) && locations.length) {
        locEl.innerHTML = locations.map(loc =>
            `<div class="item-modal-location-row">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 1118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                <span>${escapeHtml(loc)}</span>
             </div>`
        ).join('');
        locSection.style.display = '';
    } else if (locSection) {
        locSection.style.display = 'none';
    }

    // Armory purchase info
    const purchaseSection = document.getElementById('itemModalPurchaseSection');
    const purchaseEl = document.getElementById('itemModalPurchaseDetails');
    const vendorListings = Array.isArray(item.vendor_listings) ? item.vendor_listings : tryParseJSON(item.vendor_listings) || [];
    if (purchaseSection && purchaseEl && item.is_purchasable && vendorListings.length > 0) {
        purchaseEl.innerHTML = vendorListings.map(v => {
            let html = `<div class="vendor-listing-card">`;

            if (v.location) {
                html += `<div class="vendor-listing-header">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                    <span class="vendor-listing-location">${escapeHtml(v.location)}</span>
                </div>`;
            }

            if (v.credits != null) {
                const qtyLabel = v.receive_quantity != null && v.receive_quantity !== 1
                    ? ` <span class="vendor-listing-qty">for ${v.receive_quantity}×</span>` : '';
                html += `<div class="item-modal-purchase-row">
                    <span class="item-modal-purchase-label">Value</span>
                    <span class="item-modal-purchase-value item-modal-purchase-credits">
                        <img src="/assets/icons/credits.webp" alt="Credits" width="14" height="14" class="credits-icon">
                        ${Number(v.credits).toLocaleString()} Credits${qtyLabel}
                    </span>
                </div>`;
            }

            if (v.faction_rank) {
                html += `<div class="item-modal-purchase-row">
                    <span class="item-modal-purchase-label">Rank Required</span>
                    <span class="item-modal-purchase-value">${escapeHtml(v.faction_rank)}</span>
                </div>`;
            }

            const barters = Array.isArray(v.barter_trades) ? v.barter_trades : tryParseJSON(v.barter_trades) || [];
            if (barters.length > 0) {
                html += `<div class="vendor-barter-section">`;
                html += `<div class="vendor-barter-heading">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
                    Barter Trades
                </div>`;
                barters.forEach(b => {
                    const giveStr = b.give_item ? `${b.give_quantity}× ${escapeHtml(b.give_item)}` : 'Free';
                    html += `<div class="vendor-barter-row">
                        <span class="vendor-barter-give">${giveStr}</span>
                        <svg class="vendor-barter-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M5 12h14"/><polyline points="12 5 19 12 12 19"/></svg>
                        <span class="vendor-barter-receive">${b.receive_quantity}× this item</span>
                    </div>`;
                });
                html += `</div>`;
            }

            html += `</div>`;
            return html;
        }).join('');
        purchaseSection.style.display = '';
    } else if (purchaseSection) {
        purchaseSection.style.display = 'none';
    }

    // Share buttons
    setupShareButtons(item);
}

function setupShareButtons(item) {
    const pageUrl = `https://marathondb.gg/items/ranked-rewards/?item=${encodeURIComponent(item.slug)}`;
    const shareText = `${item.name} – Marathon Ranked Reward | MarathonDB`;

    document.getElementById('itemShareTwitter')?.addEventListener('click', () => {
        window.open(`https://x.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(pageUrl)}`, '_blank', 'noopener');
    });

    document.getElementById('itemShareDiscord')?.addEventListener('click', () => {
        navigator.clipboard.writeText(`**${item.name}** – Marathon Ranked Reward\n${pageUrl}`).then(() => {
            showShareToast('Copied for Discord!');
        });
    });

    document.getElementById('itemShareCopy')?.addEventListener('click', () => {
        navigator.clipboard.writeText(pageUrl).then(() => {
            showShareToast('Link copied!');
        });
    });
}

function showShareToast(msg) {
    const toast = document.getElementById('itemShareToast');
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('active');
    setTimeout(() => toast.classList.remove('active'), 2000);
}

function tryParseJSON(val) {
    if (!val) return null;
    try { return JSON.parse(val); } catch { return null; }
}

// ─── Error / Empty States ─────────────────────────────────────

function showError(msg) {
    const grid = document.getElementById('itemsGrid');
    if (grid) {
        grid.innerHTML = `<div class="items-error"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="32" height="32"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg><p>${escapeHtml(msg)}</p></div>`;
        grid.style.display = '';
    }
}

// ─── Utility ──────────────────────────────────────────────────

function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function escapeAttr(str) {
    return escapeHtml(str);
}
