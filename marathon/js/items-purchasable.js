// Purchasable Items Page JavaScript
// Only shows items where is_purchasable === true, with vendor info on cards.
// API: https://items.marathondb.gg

const ITEMS_API = 'https://items.marathondb.gg';

let allItems = [];
let filteredItems = [];
let currentSort = 'rarity';
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

// ─── Initialisation ──────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async function () {
    await loadItems();

    // Search
    document.getElementById('itemSearch')?.addEventListener('input', filterAndSortItems);

    // Sort
    document.getElementById('itemSort')?.addEventListener('change', (e) => {
        currentSort = e.target.value;
        filterAndSortItems();
    });

    // Type filter pills
    document.getElementById('typeFilterPills')?.addEventListener('click', (e) => {
        const pill = e.target.closest('.filter-pill-sm[data-type]');
        if (!pill) return;
        document.querySelectorAll('#typeFilterPills .filter-pill-sm').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        filterAndSortItems();
    });

    // Grid click delegation
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
        const [itemsRes, typesRes] = await Promise.all([
            fetch(`${ITEMS_API}/api/items`).then(r => r.json()),
            fetch(`${ITEMS_API}/api/item-types`).then(r => r.json()),
        ]);

        if (!itemsRes.success || !Array.isArray(itemsRes.data)) {
            showError('Failed to load items. Please try again later.');
            return;
        }

        // Only keep purchasable items
        allItems = itemsRes.data.filter(item => item.is_purchasable);
        filteredItems = [...allItems];

        // Build type pills from purchasable item types only
        const purchasableTypes = [...new Set(allItems.map(i => i.item_type).filter(Boolean))].sort();
        buildTypePills(purchasableTypes);
        filterAndSortItems();
        updateCount();
        injectStructuredData(allItems);
    } catch (err) {
        console.error('Items load error:', err);
        showError('Could not connect to the items database. Please try again later.');
    }
}

function buildTypePills(types) {
    const container = document.getElementById('typeFilterPills');
    if (!container) return;
    const extras = types.map(t =>
        `<button class="filter-pill filter-pill-sm" data-type="${escapeAttr(t)}">${escapeHtml(t)}</button>`
    ).join('');
    container.innerHTML =
        `<button class="filter-pill filter-pill-sm active" data-type="">All Types</button>` + extras;
}

// ─── SEO Structured Data ──────────────────────────────────────

function injectStructuredData(items) {
    if (!items || !items.length) return;

    const baseUrl = 'https://marathondb.gg/items/purchasable/';

    // ItemList schema
    const itemList = {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        'name': 'Marathon Armory Consumables',
        'description': 'Every purchasable item from Marathon\'s in-game Armory catalogue.',
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

    // FAQPage schema — "Where to find" / "How to get" for each item
    const faqEntries = [];
    for (const item of items) {
        const name = item.name;
        const vendors = Array.isArray(item.vendor_listings) ? item.vendor_listings : tryParseJSON(item.vendor_listings) || [];
        const locations = Array.isArray(item.known_locations) ? item.known_locations : tryParseJSON(item.known_locations) || [];

        // Build a useful answer
        const parts = [];
        if (vendors.length > 0) {
            const v = vendors[0];
            if (v.location && v.credits != null) {
                parts.push(`${name} can be purchased from the Armory at ${v.location} for ${Number(v.credits).toLocaleString()} credits.`);
            } else if (v.credits != null) {
                parts.push(`${name} can be purchased from the Armory for ${Number(v.credits).toLocaleString()} credits.`);
            }
            if (v.faction_rank) {
                parts.push(`Requires ${v.faction_rank} faction rank.`);
            }
            const barters = Array.isArray(v.barter_trades) ? v.barter_trades : tryParseJSON(v.barter_trades) || [];
            if (barters.length > 0) {
                const tradeDescs = barters.map(b => `${b.give_quantity}× ${b.give_item}`);
                parts.push(`Also available via barter trade: ${tradeDescs.join('; ')}.`);
            }
        }
        if (locations.length > 0) {
            parts.push(`Known locations: ${locations.join(', ')}.`);
        }
        if (item.acquisition_note) {
            parts.push(item.acquisition_note);
        }

        const answer = parts.length > 0
            ? parts.join(' ')
            : `${name} is a purchasable item available from the in-game Armory in Marathon.`;

        faqEntries.push({
            '@type': 'Question',
            'name': `Where to find ${name} in Marathon`,
            'acceptedAnswer': {
                '@type': 'Answer',
                'text': answer
            }
        });

        faqEntries.push({
            '@type': 'Question',
            'name': `How to get ${name} in Marathon`,
            'acceptedAnswer': {
                '@type': 'Answer',
                'text': answer
            }
        });
    }

    const faqSchema = {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        'mainEntity': faqEntries
    };

    // Inject into <head>
    const injectScript = (data) => {
        const el = document.createElement('script');
        el.type = 'application/ld+json';
        el.textContent = JSON.stringify(data);
        document.head.appendChild(el);
    };
    injectScript(itemList);
    injectScript(faqSchema);
}

// ─── Filter, Sort, Display ────────────────────────────────────

function filterAndSortItems() {
    const search = (document.getElementById('itemSearch')?.value || '').toLowerCase();
    const activeType = document.querySelector('#typeFilterPills .filter-pill-sm.active')?.dataset.type || '';

    filteredItems = allItems.filter(item => {
        if (search) {
            const name = (item.name || '').toLowerCase();
            const desc = (item.description || '').toLowerCase();
            const type = (item.item_type || '').toLowerCase();
            if (!name.includes(search) && !desc.includes(search) && !type.includes(search)) return false;
        }
        if (activeType && (item.item_type || '') !== activeType) return false;
        return true;
    });

    sortItems();
    displayItems(filteredItems);
    updateCount();
}

function sortItems() {
    filteredItems.sort((a, b) => {
        switch (currentSort) {
            case 'name':      return (a.name || '').localeCompare(b.name || '');
            case 'name-desc': return (b.name || '').localeCompare(a.name || '');
            case 'rarity':
                return (RARITY_ORDER[(b.rarity || 'standard')] || 0) -
                       (RARITY_ORDER[(a.rarity || 'standard')] || 0);
            case 'value':     return (b.value || 0) - (a.value || 0);
            default:          return 0;
        }
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
        const verifiedBadge = item.verified
            ? `<svg class="item-verified-icon" viewBox="0 0 24 24" fill="currentColor" width="13" height="13" title="Verified"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>`
            : '';

        // Extract vendor info for card display
        const vendors = Array.isArray(item.vendor_listings) ? item.vendor_listings : tryParseJSON(item.vendor_listings) || [];
        let vendorSnippet = '';
        if (vendors.length > 0) {
            const v = vendors[0];
            const parts = [];
            if (v.credits != null) {
                parts.push(`<span class="purchasable-card-cost"><img src="/assets/icons/credits.webp" alt="Credits" width="12" height="12" class="credits-icon"> ${Number(v.credits).toLocaleString()}</span>`);
            }
            if (v.location) {
                parts.push(`<span class="purchasable-card-location"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg> ${escapeHtml(v.location)}</span>`);
            }
            if (parts.length) {
                vendorSnippet = `<div class="purchasable-card-vendor">${parts.join('')}</div>`;
            }
        }

        return `
            <div class="core-card ${rarity}" data-slug="${escapeAttr(item.slug)}" role="button" tabindex="0">
                <div class="core-card-glow"></div>
                <div class="core-card-header">
                    <span class="item-type-pill">${escapeHtml(type)}</span>
                </div>
                <div class="core-icon-container">
                    <div class="core-icon ${rarity}">
                        ${imgSrc
                            ? `<img src="${escapeAttr(imgSrc)}" alt="${escapeAttr(item.name)} – Marathon purchasable item" onerror="this.parentElement.classList.add('icon-fallback')" loading="lazy">`
                            : `<span class="item-icon-placeholder">${escapeHtml(type.charAt(0))}</span>`
                        }
                    </div>
                </div>
                <div class="core-card-content">
                    <div class="core-name">${escapeHtml(item.name || 'Unknown')}${verifiedBadge}</div>
                    ${item.description ? `<div class="core-description-snippet">${escapeHtml(item.description)}</div>` : ''}
                    ${vendorSnippet}
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
    ['itemModalLocationsSection', 'itemModalAcqSection', 'itemModalPurchaseSection'].forEach(id => {
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
    const purchaseBadge = item.is_purchasable
        ? `<span class="cd-badge cd-badge-purchasable">
               <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
               Purchasable
           </span>`
        : '';
    document.getElementById('itemModalBadges').innerHTML = `
        <span class="cd-badge cd-badge-type">${escapeHtml(type)}</span>
        <span class="cd-badge cd-badge-rarity ${rarity}">${escapeHtml(RARITY_LABELS[rarity] || rarity)}</span>
        ${verifiedBadge}
        ${purchaseBadge}
    `;

    // Quick stats
    const stats = [];
    if (item.value != null) {
        stats.push(`<div class="core-modal-qs"><span class="core-modal-qs-label">Value</span><span class="core-modal-qs-value">${Number(item.value).toLocaleString()}</span></div>`);
    }
    stats.push(`<div class="core-modal-qs"><span class="core-modal-qs-label">Type</span><span class="core-modal-qs-value">${escapeHtml(type)}</span></div>`);
    stats.push(`<div class="core-modal-qs"><span class="core-modal-qs-label">Rarity</span><span class="core-modal-qs-value">${escapeHtml(RARITY_LABELS[rarity] || rarity)}</span></div>`);
    document.getElementById('itemModalQuickStats').innerHTML = stats.join('');

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

    // Armory purchase info — vendor_listings
    const purchaseSection = document.getElementById('itemModalPurchaseSection');
    const purchaseEl = document.getElementById('itemModalPurchaseDetails');
    const vendorListings = Array.isArray(item.vendor_listings) ? item.vendor_listings : tryParseJSON(item.vendor_listings) || [];
    if (purchaseSection && purchaseEl && item.is_purchasable && vendorListings.length > 0) {
        purchaseEl.innerHTML = vendorListings.map((v, i) => {
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
